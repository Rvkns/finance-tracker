import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    // Protect dashboard and statistics routes
    if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/statistics') || pathname.startsWith('/setup'))) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    if (user) {
        // Fetch user profile to check household_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('household_id')
            .eq('id', user.id)
            .single();

        const hasHousehold = !!profile?.household_id;

        // If logged in but no household, force setup
        if (!hasHousehold && pathname !== '/setup' && pathname !== '/profile') {
            const url = request.nextUrl.clone();
            url.pathname = '/setup';
            return NextResponse.redirect(url);
        }

        // If logged in and has household, redirect away from login/signup/setup
        if (hasHousehold && (pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname === '/setup')) {
            const url = request.nextUrl.clone();
            url.pathname = '/dashboard';
            return NextResponse.redirect(url);
        }

        // Redirect from root
        if (!hasHousehold && pathname === '/') {
            const url = request.nextUrl.clone();
            url.pathname = '/setup';
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
