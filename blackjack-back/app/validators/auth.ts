import vine from '@vinejs/vine'

export const loginValidator = vine.compile(
    vine.object({
        email: vine.string().email(),
        password: vine.string().minLength(6),
    })
)

export const registerValidator = vine.compile(
    vine.object({
        fullName: vine.string().minLength(3),
        email: vine.string().email(),
        password: vine.string().minLength(6),
    })
)


