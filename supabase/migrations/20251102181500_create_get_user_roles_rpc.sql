-- Create RPC function to get user roles (bypasses RLS using SECURITY DEFINER)
-- This ensures users can always fetch their own roles even if RLS policies have issues

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TABLE(role app_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id;
END;
$$;

-- Grant execute permission for authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION public.get_user_roles(UUID) IS 'Get all roles for a user. Uses SECURITY DEFINER to bypass RLS issues during authentication.';

