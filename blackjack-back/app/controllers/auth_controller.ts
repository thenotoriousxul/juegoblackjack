import type { HttpContext } from '@adonisjs/core/http'
import { loginValidator, registerValidator } from '#validators/auth'
import User from '#models/user'

export default class AuthController {
  
  async login({request, response, auth}: HttpContext) {
    const payload = await loginValidator.validate(request.all())
    const user = await User.verifyCredentials(payload.email, payload.password)

    const token = await auth.use('api').createToken(user)

    return response.ok({
      message: 'Login successful',
      data: {
        user: user,
        token: token
      }
    })
  }


  async me({auth, response}: HttpContext) {
    const user = await auth.use('api').authenticate()

    return response.ok({
      message: 'User retrieved successfully',
      data: user
    })
  }

  async register({request, response}: HttpContext) {
    const payload = await registerValidator.validate(request.all())
    const user = await User.create(payload)

    return response.created({
      message: 'User registered successfully',
      data: user
    })
  }

  async logout({auth, response}: HttpContext) {
    await auth.use('api').invalidateToken()

    return response.ok({
      message: 'Logout successful'
    })
  }
  
}