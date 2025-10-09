import z from 'zod'

export const registerSchema = z.object({
    nombre: z.string({
        required_error:'el nombre de usuario es requerido'
    }),
    correo: z.string ({
        required_error: 'el correo es requerido'
    }).email({
        message: 'correo invalido'
    }),
    clave: z.string({
        required_error: 'la clave es requerida'
    }).min(7,{
        message:'la clave debe tener como minimo 7 caracteres'
    })
})

export const loginSchema = z.object({
    correo: z.string({
        required_error: 'El correo es requerido'
    }).email({
        message:'Correo inválido'
    }),
    clave: z.string({
        required_error:'la clave es requerida',
    }).min(7,{
        message:'la clave debe tener como minimo 7 caracteres'
    })
})