import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    password_confirm: '',
    code: ''
  })
  const [twoFARequired, setTwoFARequired] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login, verify2FA, register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (twoFARequired) {
        const result = await verify2FA(formData.email, formData.code)
        navigate('/dashboard')
      } else if (isLogin) {
        const result = await login(formData.email, formData.password)
        if (result.twofa_required) {
          setTwoFARequired(true)
        } else {
          navigate('/dashboard')
        }
      } else {
        if (formData.password !== formData.password_confirm) {
          setError('Passwords do not match')
          return
        }
        
        await register(formData.username, formData.email, formData.password, formData.password_confirm)
        
        // Auto-login after registration
        const loginResult = await login(formData.email, formData.password)
        if (loginResult.twofa_required) {
          setTwoFARequired(true)
        } else {
          navigate('/dashboard')
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-blue-600">Whisper</Link>
          <p className="text-gray-600 mt-2">
            {twoFARequired ? 'Enter verification code' : 
             isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {twoFARequired ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className="input-field text-center text-lg tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Check your email for the 6-digit code
                </p>
              </div>
            ) : (
              <>
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Choose a username"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="input-field pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password_confirm"
                      value={formData.password_confirm}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-lg py-3"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="spinner mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  {twoFARequired ? 'Verify Code' :
                   isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            {twoFARequired ? (
              <button
                onClick={() => setTwoFARequired(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back to login
              </button>
            ) : (
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            )}
          </div>
        </div>

        {/* Security notice */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Protected by end-to-end encryption</p>
        </div>
      </div>
    </div>
  )
}



// import { useState } from 'react'
// import { useAuth } from '../contexts/AuthContext'
// import { Link, useNavigate } from 'react-router-dom'
// import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

// export default function Login() {
//   const [isLogin, setIsLogin] = useState(true)
//   const [formData, setFormData] = useState({
//     email: '',
//     password: '',
//     username: '',
//     password_confirm: '',
//     code: ''
//   })
//   const [twoFARequired, setTwoFARequired] = useState(false)
//   const [showPassword, setShowPassword] = useState(false)
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')

//   const { login, verify2FA, register } = useAuth()
//   const navigate = useNavigate()

//   // Preset login credentials for quick testing
//   const testCredentials = [
//     { email: 'admin@example.com', password: 'admin123', label: 'Admin User' },
//     { email: 'alice@example.com', password: 'alice123', label: 'Alice' },
//     { email: 'bob@example.com', password: 'bob123', label: 'Bob' },
//     { email: 'test@example.com', password: 'MySecurePass2025!', label: 'Test User' },
//     { email: 'frontenduser@example.com', password: 'MyFrontendPass2025!', label: 'Frontend User' }
//   ]

//   const handleChange = (e) => {
//     setFormData(prev => ({
//       ...prev,
//       [e.target.name]: e.target.value
//     }))
//   }

//   // Direct login with preset credentials
//   const handleQuickLogin = async (credentials) => {
//     setLoading(true)
//     setError('')
    
//     try {
//       const result = await login(credentials.email, credentials.password)
//       if (result.twofa_required) {
//         setTwoFARequired(true)
//         setFormData(prev => ({ ...prev, email: credentials.email }))
//       } else {
//         navigate('/dashboard')
//       }
//     } catch (err) {
//       setError(`Quick login failed: ${err.response?.data?.detail || 'Invalid credentials'}`)
//     } finally {
//       setLoading(false)
//     }
//   }

//   // Fill form with preset credentials
//   const fillCredentials = (credentials) => {
//     setFormData(prev => ({
//       ...prev,
//       email: credentials.email,
//       password: credentials.password
//     }))
//   }

//   // Mock login bypass for development
//   const handleMockLogin = () => {
//     // Set mock authentication data
//     localStorage.setItem('access_token', 'mock_access_token_for_development')
//     localStorage.setItem('refresh_token', 'mock_refresh_token_for_development')
//     localStorage.setItem('user', JSON.stringify({
//       id: "71450b2f-4ad2-43b5-aebd-5c1adee40475",
//       username: "testuser",
//       email: "test@example.com",
//       first_name: "",
//       last_name: "",
//       avatar: null,
//       bio: null,
//       is_online: true
//     }))
    
//     console.log('🚀 Mock login activated')
//     navigate('/dashboard')
//   }

//   const handleSubmit = async (e) => {
//     e.preventDefault()
//     setLoading(true)
//     setError('')

//     try {
//       if (twoFARequired) {
//         const result = await verify2FA(formData.email, formData.code)
//         navigate('/dashboard')
//       } else if (isLogin) {
//         const result = await login(formData.email, formData.password)
//         if (result.twofa_required) {
//           setTwoFARequired(true)
//         } else {
//           navigate('/dashboard')
//         }
//       } else {
//         if (formData.password !== formData.password_confirm) {
//           setError('Passwords do not match')
//           return
//         }
        
//         await register(formData.username, formData.email, formData.password, formData.password_confirm)
        
//         // Auto-login after registration
//         const loginResult = await login(formData.email, formData.password)
//         if (loginResult.twofa_required) {
//           setTwoFARequired(true)
//         } else {
//           navigate('/dashboard')
//         }
//       }
//     } catch (err) {
//       setError(err.response?.data?.detail || err.response?.data?.message || 'An error occurred')
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
//       <div className="max-w-md w-full">
//         {/* Header */}
//         <div className="text-center mb-8">
//           <Link to="/" className="text-3xl font-bold text-blue-600">Whisper</Link>
//           <p className="text-gray-600 mt-2">
//             {twoFARequired ? 'Enter verification code' : 
//              isLogin ? 'Sign in to your account' : 'Create your account'}
//           </p>
//         </div>

//         {/* Quick Login Options - Only show in development and for login */}
//         {process.env.NODE_ENV === 'development' && isLogin && !twoFARequired && (
//           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
//             <h3 className="text-sm font-medium text-yellow-800 mb-3">
//               🚀 Development Quick Login
//             </h3>
            
//             {/* Mock Login Button */}
//             <button
//               onClick={handleMockLogin}
//               className="w-full mb-3 px-3 py-2 bg-orange-500 text-white text-sm rounded-md hover:bg-orange-600 transition-colors"
//             >
//               🔧 Mock Login (Skip Backend)
//             </button>
            
//             {/* Preset Credentials */}
//             <div className="space-y-2">
//               <p className="text-xs text-yellow-700">Quick login with test accounts:</p>
//               {testCredentials.map((cred, index) => (
//                 <div key={index} className="flex space-x-2">
//                   <button
//                     onClick={() => handleQuickLogin(cred)}
//                     className="flex-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
//                     disabled={loading}
//                   >
//                     Login as {cred.label}
//                   </button>
//                   <button
//                     onClick={() => fillCredentials(cred)}
//                     className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
//                   >
//                     Fill
//                   </button>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Form */}
//         <div className="bg-white rounded-xl shadow-sm p-8">
//           {error && (
//             <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
//               {error}
//             </div>
//           )}

//           <form onSubmit={handleSubmit} className="space-y-6">
//             {twoFARequired ? (
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Verification Code
//                 </label>
//                 <input
//                   type="text"
//                   name="code"
//                   value={formData.code}
//                   onChange={handleChange}
//                   className="input-field text-center text-lg tracking-widest"
//                   placeholder="000000"
//                   maxLength={6}
//                   required
//                 />
//                 <p className="text-xs text-gray-500 mt-1">
//                   Check your email for the 6-digit code
//                 </p>
//               </div>
//             ) : (
//               <>
//                 {!isLogin && (
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Username
//                     </label>
//                     <input
//                       type="text"
//                       name="username"
//                       value={formData.username}
//                       onChange={handleChange}
//                       className="input-field"
//                       placeholder="Choose a username"
//                       required
//                     />
//                   </div>
//                 )}

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Email Address
//                   </label>
//                   <input
//                     type="email"
//                     name="email"
//                     value={formData.email}
//                     onChange={handleChange}
//                     className="input-field"
//                     placeholder="your@email.com"
//                     required
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Password
//                   </label>
//                   <div className="relative">
//                     <input
//                       type={showPassword ? 'text' : 'password'}
//                       name="password"
//                       value={formData.password}
//                       onChange={handleChange}
//                       className="input-field pr-10"
//                       placeholder="••••••••"
//                       required
//                     />
//                     <button
//                       type="button"
//                       onClick={() => setShowPassword(!showPassword)}
//                       className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                     >
//                       {showPassword ? (
//                         <EyeSlashIcon className="w-5 h-5" />
//                       ) : (
//                         <EyeIcon className="w-5 h-5" />
//                       )}
//                     </button>
//                   </div>
//                 </div>

//                 {!isLogin && (
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Confirm Password
//                     </label>
//                     <input
//                       type={showPassword ? 'text' : 'password'}
//                       name="password_confirm"
//                       value={formData.password_confirm}
//                       onChange={handleChange}
//                       className="input-field"
//                       placeholder="••••••••"
//                       required
//                     />
//                   </div>
//                 )}
//               </>
//             )}

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full btn-primary text-lg py-3"
//             >
//               {loading ? (
//                 <div className="flex items-center justify-center">
//                   <div className="spinner mr-2"></div>
//                   Processing...
//                 </div>
//               ) : (
//                 <>
//                   {twoFARequired ? 'Verify Code' :
//                    isLogin ? 'Sign In' : 'Create Account'}
//                 </>
//               )}
//             </button>
//           </form>

//           {/* Footer */}
//           <div className="mt-8 text-center">
//             {twoFARequired ? (
//               <button
//                 onClick={() => setTwoFARequired(false)}
//                 className="text-sm text-gray-600 hover:text-gray-800"
//               >
//                 ← Back to login
//               </button>
//             ) : (
//               <button
//                 onClick={() => setIsLogin(!isLogin)}
//                 className="text-sm text-blue-600 hover:text-blue-800"
//               >
//                 {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
//               </button>
//             )}
//           </div>
//         </div>

//         {/* Security notice */}
//         <div className="mt-6 text-center text-xs text-gray-500">
//           <p>Protected by end-to-end encryption</p>
//         </div>
//       </div>
//     </div>
//   )
// }
