import { signup } from '../actions'

export default function RegisterPage() {
  return (
    <form>
      <h1>Register</h1>
      <label htmlFor="email">Email:</label>
      <input id="email" name="email" type="email" required />
      <label htmlFor="password">Password:</label>
      <input id="password" name="password" type="password" required />
      <button formAction={signup}>Sign up</button>
    </form>
  )
}