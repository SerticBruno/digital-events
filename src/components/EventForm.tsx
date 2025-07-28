'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, MapPin, Users, FileText } from 'lucide-react'
import { getInputClasses, getButtonClasses, componentStyles } from '@/lib/design-system'

const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  location: z.string().optional(),
  maxGuests: z.string().optional().transform(val => val ? parseInt(val) : null)
})

type EventFormData = z.infer<typeof eventSchema>

interface EventFormProps {
  onSubmit: (data: EventFormData) => Promise<void>
  initialData?: Partial<EventFormData>
  isLoading?: boolean
}

export default function EventForm({ onSubmit, initialData, isLoading = false }: EventFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: initialData
  })

  const handleFormSubmit = async (data: EventFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      if (!initialData) {
        reset()
      }
    } catch (error) {
      console.error('Failed to submit event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <label className={componentStyles.label}>
          <FileText className="w-4 h-4 inline mr-2" />
          Event Name *
        </label>
        <input
          type="text"
          {...register('name')}
          className={getInputClasses(!!errors.name)}
          placeholder="Enter event name"
        />
        {errors.name && (
          <p className={componentStyles.errorMessage}>{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className={componentStyles.label}>
          <FileText className="w-4 h-4 inline mr-2" />
          Description
        </label>
        <textarea
          {...register('description')}
          rows={3}
          className={getInputClasses()}
          placeholder="Enter event description"
        />
      </div>

      <div>
        <label className={componentStyles.label}>
          <Calendar className="w-4 h-4 inline mr-2" />
          Date *
        </label>
        <input
          type="datetime-local"
          {...register('date')}
          className={getInputClasses(!!errors.date)}
        />
        {errors.date && (
          <p className={componentStyles.errorMessage}>{errors.date.message}</p>
        )}
      </div>

      <div>
        <label className={componentStyles.label}>
          <MapPin className="w-4 h-4 inline mr-2" />
          Location
        </label>
        <input
          type="text"
          {...register('location')}
          className={getInputClasses()}
          placeholder="Enter event location"
        />
      </div>

      <div>
        <label className={componentStyles.label}>
          <Users className="w-4 h-4 inline mr-2" />
          Maximum Guests
        </label>
        <input
          type="number"
          {...register('maxGuests')}
          className={getInputClasses()}
          placeholder="Enter maximum number of guests"
          min="1"
        />
      </div>

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
          {isSubmitting ? 'Creating...' : initialData ? 'Update Event' : 'Create Event'}
        </button>
      </div>
    </form>
  )
} 