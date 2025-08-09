// Mock user data based on your successful registration
export const mockUser = {
  id: "71450b2f-4ad2-43b5-aebd-5c1adee40475",
  username: "testuser",
  email: "test@example.com",
  first_name: "",
  last_name: "",
  avatar: null,
  bio: null,
  phone_number: null,
  twofa_enabled: false,
  is_online: true,
  last_seen: new Date().toISOString(),
  show_last_seen: "everyone",
  show_status_to: "everyone",
  date_joined: "2025-08-09T06:56:08.861606Z"
};

export const mockTokens = {
  access: "mock_access_token_for_development",
  refresh: "mock_refresh_token_for_development"
};

// Function to bypass login
export const bypassLogin = () => {
  localStorage.setItem('access_token', mockTokens.access);
  localStorage.setItem('refresh_token', mockTokens.refresh);
  localStorage.setItem('user', JSON.stringify(mockUser));
  
  console.log('🚀 Login bypassed for development');
  return mockUser;
};
