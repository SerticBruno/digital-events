'use client'

import { useState } from 'react'
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react'
import { getButtonClasses } from '@/lib/design-system'

interface CSVUploadProps {
  eventId?: string
  onUpload: (guests: Array<{ firstName: string; lastName: string; email: string; company?: string; position?: string; phone?: string; isVip: boolean }>) => Promise<void>
  isGlobal?: boolean
}

interface CSVRow {
  firstName: string
  lastName: string
  email: string
  company?: string
  position?: string
  phone?: string
  isVip: boolean
}

export default function CSVUpload({ onUpload }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CSVRow[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please select a valid CSV file')
      return
    }

    setFile(selectedFile)
    setError('')
    setSuccess('')
    parseCSV(selectedFile)
  }

  const parseCSV = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      const data: CSVRow[] = []
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim())
          const row: Partial<CSVRow> = {}
          
          headers.forEach((header, index) => {
            if (values[index]) {
              if (header === 'isvip') {
                row.isVip = values[index].toLowerCase() === 'true' || values[index] === '1'
              } else if (header in row) {
                (row as Record<string, string>)[header] = values[index]
              }
            }
          })
          
          if (row.firstName && row.lastName && row.email) {
            data.push(row as CSVRow)
          }
        }
      }
      
      setPreview(data.slice(0, 5)) // Show first 5 rows as preview
    }
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError('')
    setSuccess('')

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const text = e.target?.result as string
        const lines = text.split('\n')
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        
        const guests: CSVRow[] = []
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
                      const values = lines[i].split(',').map(v => v.trim())
            const row: Partial<CSVRow> = {}
            
            headers.forEach((header, index) => {
              if (values[index]) {
                if (header === 'isvip') {
                  row.isVip = values[index].toLowerCase() === 'true' || values[index] === '1'
                } else if (header in row) {
                  (row as Record<string, string>)[header] = values[index]
                }
              }
            })
            
            if (row.firstName && row.lastName && row.email) {
              guests.push(row as CSVRow)
            }
          }
        }

        await onUpload(guests)
        setSuccess(`Successfully uploaded ${guests.length} guests`)
        setFile(null)
        setPreview([])
      }
      reader.readAsText(file)
    } catch {
      setError('Failed to upload CSV file')
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `firstName,lastName,email,company,position,phone,isVip
John,Doe,john.doe@example.com,Company Inc,Manager,+1234567890,false
Jane,Smith,jane.smith@example.com,Another Corp,Director,+1234567891,true`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'guests_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Bulk Import Guests</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload a CSV file to add multiple guests at once. Download the template below for the correct format.
        </p>
        
        <button
          onClick={downloadTemplate}
          className={getButtonClasses('secondary')}
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <label htmlFor="csv-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Upload CSV file
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                or drag and drop
              </span>
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        </div>
      )}

      {preview.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Preview (first 5 rows):</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-600">Name</th>
                  <th className="text-left py-2 text-gray-600">Email</th>
                  <th className="text-left py-2 text-gray-600">Company</th>
                  <th className="text-left py-2 text-gray-600">VIP</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-2 text-gray-900">{row.firstName} {row.lastName}</td>
                    <td className="py-2 text-gray-900">{row.email}</td>
                    <td className="py-2 text-gray-900">{row.company || '-'}</td>
                    <td className="py-2 text-gray-900">{row.isVip ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {file && (
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className={getButtonClasses('primary')}
          >
            {isUploading ? 'Uploading...' : 'Upload Guests'}
          </button>
        </div>
      )}
    </div>
  )
} 