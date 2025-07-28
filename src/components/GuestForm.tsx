'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Building, Phone, Crown } from 'lucide-react'
import { getInputClasses, getButtonClasses, componentStyles } from '@/lib/design-system'

const guestSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  company: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  isVip: z.boolean().default(false)
})

type GuestFormData = z.infer<typeof guestSchema>

interface GuestFormProps {
  eventId?: string
  onSubmit: (data: GuestFormData) => Promise<void>
  initialData?: Partial<GuestFormData>
  isLoading?: boolean
  isGlobal?: boolean
}

export default function GuestForm({ eventId, onSubmit, initialData, isLoading = false, isGlobal = false }: GuestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: initialData
  })

  const isVip = watch('isVip')

  const handleFormSubmit = async (data: GuestFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      if (!initialData) {
        reset()
      }
    } catch (error) {
      console.error('Failed to submit guest:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={componentStyles.label}>
            <User className="w-4 h-4 inline mr-2" />
            First Name *
          </label>
          <input
            type="text"
            {...register('firstName')}
            className={getInputClasses(!!errors.firstName)}
            placeholder="Enter first name"
          />
          {errors.firstName && (
            <p className={componentStyles.errorMessage}>{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <label className={componentStyles.label}>
            <User className="w-4 h-4 inline mr-2" />
            Last Name *
          </label>
          <input
            type="text"
            {...register('lastName')}
            className={getInputClasses(!!errors.lastName)}
            placeholder="Enter last name"
          />
          {errors.lastName && (
            <p className={componentStyles.errorMessage}>{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className={componentStyles.label}>
          <Mail className="w-4 h-4 inline mr-2" />
          Email *
        </label>
        <input
          type="email"
          {...register('email')}
          className={getInputClasses(!!errors.email)}
          placeholder="Enter email address"
        />
        {errors.email && (
          <p className={componentStyles.errorMessage}>{errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={componentStyles.label}>
            <Building className="w-4 h-4 inline mr-2" />
            Company
          </label>
          <input
            type="text"
            {...register('company')}
            className={getInputClasses()}
            placeholder="Enter company name"
          />
        </div>

        <div>
          <label className={componentStyles.label}>
            <User className="w-4 h-4 inline mr-2" />
            Position
          </label>
          <input
            type="text"
            {...register('position')}
            className={getInputClasses()}
            placeholder="Enter job position"
          />
        </div>
      </div>

      <div>
        <label className={componentStyles.label}>
          <Phone className="w-4 h-4 inline mr-2" />
          Phone Number
        </label>
        <input
          type="tel"
          {...register('phone')}
          className={getInputClasses()}
          placeholder="Enter phone number"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          {...register('isVip')}
          id="isVip"
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="isVip" className="ml-2 flex items-center text-sm font-medium text-gray-900">
          <Crown className="w-4 h-4 mr-2" />
          VIP Guest
        </label>
      </div>

      {isVip && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Crown className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              VIP guests will receive special QR codes and priority treatment.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => reset()}
          className={getButtonClasses('secondary')}
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className={getButtonClasses('primary')}
        >
          {isSubmitting ? 'Adding...' : initialData ? 'Update Guest' : 'Add Guest'}
        </button>
      </div>
    </form>
  )
} 