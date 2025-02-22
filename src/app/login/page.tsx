import { login } from '../actions'

export default function LoginPage() {
  return (
    <form>
      <h1>Login</h1>
      <label htmlFor="email">Email:</label>
      <input id="email" name="email" type="email" required />
      <label htmlFor="password">Password:</label>
      <input id="password" name="password" type="password" required />
      <button formAction={login}>Log in</button>
    </form>
  )
}