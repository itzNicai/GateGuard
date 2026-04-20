import { z } from 'zod'

// Reusable phone validation — Philippine format (09XX XXX XXXX or +63XXXXXXXXXX)
const phoneValidation = z.string()
  .refine(
    (v) => !v || /^(09\d{9}|\+63\d{10})$/.test(v.replace(/[\s-]/g, '')),
    { message: 'Enter a valid PH phone (09XX XXX XXXX)' }
  )

// Reusable vehicle plate validation — Philippine format (e.g. ABC 1234, AB 1234)
const vehiclePlateValidation = z.string()
  .refine(
    (v) => !v || /^[A-Za-z]{2,3}\s?\d{3,4}$/.test(v.trim()),
    { message: 'Enter a valid plate (e.g. ABC 1234)' }
  )

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    phone: phoneValidation.optional().or(z.literal('')),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password is too long')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
    block: z.string().min(1, 'Select a block'),
    lot: z.string().min(1, 'Select a lot'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type RegisterValues = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
})
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const visitorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  phone: phoneValidation.optional().or(z.literal('')),
  purpose: z.string().min(3, 'Describe the purpose of your visit').max(500, 'Purpose is too long'),
  vehiclePlate: vehiclePlateValidation.optional().or(z.literal('')),
  homeownerId: z.string().min(1, 'Select a homeowner'),
})
export type VisitorValues = z.infer<typeof visitorSchema>

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  phone: phoneValidation.optional().or(z.literal('')),
})
export type ProfileValues = z.infer<typeof profileSchema>

export const changePasswordSchema = z
  .object({
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password is too long')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export const addGuardSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
})
export type AddGuardValues = z.infer<typeof addGuardSchema>
