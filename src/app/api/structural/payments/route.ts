import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { expense_id, month_key } = body;

    if (!expense_id || !month_key) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify the expense exists and belongs to the user's household
    const { data: expense } = await supabase
        .from('structural_expenses')
        .select('household_id')
        .eq('id', expense_id)
        .single();

    if (!expense) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .single();

    if (profile?.household_id !== expense.household_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
        .from('structural_expense_payments')
        .upsert({ expense_id, month_key })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const expense_id = searchParams.get('expense_id');
    const month_key = searchParams.get('month_key');

    if (!expense_id || !month_key) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify the expense exists and belongs to the user's household
    const { data: expense } = await supabase
        .from('structural_expenses')
        .select('household_id')
        .eq('id', expense_id)
        .single();

    if (!expense) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .single();

    if (profile?.household_id !== expense.household_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
        .from('structural_expense_payments')
        .delete()
        .eq('expense_id', expense_id)
        .eq('month_key', month_key);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
