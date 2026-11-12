
import { useState, type FormEvent } from 'react'
import { Store, Lock, Mail, AlertCircle } from 'lucide-react'
import api from '../services/api'

interface User {
    id: number
    name: string
    email: string
    role: string
}

interface LoginProps {
    onLogin: (user: User) => void
}

function Login({ onLogin }: LoginProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await api.post('/login', {
                email,
                password,
            })

            const { token, user } = response.data

            localStorage.setItem('biztrack_token', token)

            onLogin(user)
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                'Unable to connect to the server. Please try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand-icon">
                    <Store size={30} />
                </div>

                <h1>Welcome to BizTrack</h1>
                <p className="login-subtitle">
                    Sign in to manage your business.
                </p>

                {error && (
                    <div className="login-error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <label>Email Address</label>
                    <div className="login-input">
                        <Mail size={18} />
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <label>Password</label>
                    <div className="login-input">
                        <Lock size={18} />
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-submit"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="login-footer">
                    BizTrack Business Management System
                </p>
            </div>
        </div>
    )
}

export default Login
