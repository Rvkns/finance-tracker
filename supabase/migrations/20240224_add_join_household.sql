-- Function to allow a user to join an existing household via invite code
CREATE OR REPLACE FUNCTION public.join_household(p_invite_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_household_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current authenticated user executing the request
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the invite code exists
  SELECT id INTO v_household_id 
  FROM public.households
  WHERE invite_code = p_invite_code
  LIMIT 1;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code or household does not exist';
  END IF;

  -- Update the user's profile to link them to the household
  UPDATE public.profiles
  SET household_id = v_household_id, updated_at = NOW()
  WHERE id = v_user_id;

  RETURN v_household_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
