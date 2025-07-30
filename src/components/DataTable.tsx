'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search, Eye, Edit, Trash2, User, Mail, Building, QrCode, Calendar, BarChart3 } from 'lucide-react'

// Generic type for table data rows - more flexible
export interface TableRow {
  id: string
  [key: string]: unknown
}

// Type for the render function
export type RenderFunction<T = Record<string, unknown>> = (value: unknown, row: T) => React.ReactNode

interface Column<T = Record<string, unknown>> {
  key: string
  label: string
  sortable?: boolean
  render?: RenderFunction<T>
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T extends Record<string, unknown> = Record<string, unknown>> {
  data: (T & { id: string })[]
  columns: Column<T>[]
  onRowSelect?: (selectedIds: Set<string>) => void
  onRowAction?: (action: string, row: T) => void
  selectable?: boolean
  searchable?: boolean
  pagination?: boolean
  itemsPerPage?: number
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export default function DataTable<T extends Record<string, unknown> = Record<string, unknown>>({
  data,
  columns,
  onRowSelect,
  selectable = false,
  searchable = false,
  pagination = false,
  itemsPerPage = 10,
  loading = false,
  emptyMessage = "No data available",
  className = ""
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let result = [...data]

    // Apply search filter
    if (searchTerm) {
      result = result.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        
        // Convert to strings for comparison
        const aStr = String(aValue ?? '')
        const bStr = String(bValue ?? '')
        
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, searchTerm, sortConfig])

  // Pagination
  const paginatedData = useMemo(() => {
    if (!pagination) return filteredAndSortedData
    
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedData, currentPage, itemsPerPage, pagination])

  // Page change handler with transition
  const handlePageChange = (newPage: number) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentPage(newPage)
      setIsTransitioning(false)
    }, 150) // 150ms transition
  }

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage)

  // Handlers
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null
      }
      return { key, direction: 'asc' }
    })
  }

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set())
      onRowSelect?.(new Set())
    } else {
      const newSelected = new Set(paginatedData.map(row => row.id))
      setSelectedRows(newSelected)
      onRowSelect?.(newSelected)
    }
  }

  const handleRowSelect = (rowId: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId)
    } else {
      newSelected.add(rowId)
    }
    setSelectedRows(newSelected)
    onRowSelect?.(newSelected)
  }

  const renderCell = (column: Column<T>, row: T) => {
    if (column.render) {
      return column.render(row[column.key], row)
    }
    return String(row[column.key] ?? '-')
  }

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) {
      return <ChevronDown className="w-4 h-4 text-gray-400" />
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Search and Filters */}
      {searchable && (
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search guests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 font-medium"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${column.width ? column.width : ''} ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={`flex items-center ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : ''}`}>
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="ml-1">
                        {getSortIcon(column.key)}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row) => (
              <tr
                key={row.id}
                className={`hover:bg-gray-50 transition-colors ${isTransitioning ? 'opacity-50' : ''}`}
              >
                {selectable && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => handleRowSelect(row.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''
                    }`}
                  >
                    {renderCell(column, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {paginatedData.length === 0 && (
        <div className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <User className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Pre-built column renderers for common data types
export const columnRenderers = {
  // Guest information with avatar
  guest: (value: unknown, row: Record<string, unknown>): React.ReactNode => (
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0 h-10 w-10">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-sm font-medium text-white">
            {(row.firstName as string)?.charAt(0)}{(row.lastName as string)?.charAt(0)}
          </span>
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">
          {String(row.firstName ?? '')} {String(row.lastName ?? '')}
        </div>
        <div className="text-sm text-gray-500 flex items-center">
          <Mail className="w-3 h-3 mr-1" />
          {String(row.email ?? '')}
        </div>
        {Boolean(row.company) && (
          <div className="text-sm text-gray-400 flex items-center">
            <Building className="w-3 h-3 mr-1" />
            {String(row.company)}
          </div>
        )}
      </div>
    </div>
  ),

  // Company with icon
  company: (value: unknown): React.ReactNode => (
    <div className="flex items-center">
      <Building className="w-4 h-4 text-gray-400 mr-2" />
      <span className="text-sm text-gray-900">{String(value ?? 'No company')}</span>
    </div>
  ),

  // Status badge
  status: (value: unknown): React.ReactNode => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      'COMING': { bg: 'bg-green-100', text: 'text-green-800', label: 'Coming' },
      'COMING_WITH_PLUS_ONE': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Coming +1' },
      'NOT_COMING': { bg: 'bg-red-100', text: 'text-red-800', label: 'Not Coming' },
      'SENT': { bg: 'bg-green-100', text: 'text-green-800', label: 'Sent' },
      'RESPONDED': { bg: 'bg-green-100', text: 'text-green-800', label: 'Responded' },
      'PENDING': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Not Sent' },
      'GUEST': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Guest' },
      'USED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Used' },
      'GENERATED': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Generated' },
      'CREATED': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Created' },
      'EXPIRED': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Expired' }
    }

    const config = statusConfig[value as string] || { bg: 'bg-gray-100', text: 'text-gray-800', label: String(value ?? 'No Response') }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  },

  // VIP status
  vip: (value: unknown): React.ReactNode => (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
      value ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
    }`}>
      {value ? 'VIP' : 'Regular'}
    </span>
  ),

  // Plus-one status
  plusOne: (value: unknown, row: Record<string, unknown>): React.ReactNode => {
    const isPlusOne = row.isPlusOne
    const hasPlusOne = (row.invitations as Array<{ hasPlusOne: boolean }>)?.[0]?.hasPlusOne

    let config = { bg: 'bg-gray-100', text: 'text-gray-800', label: 'No Plus-One' }
    
    if (isPlusOne) {
      config = { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Plus-One Guest' }
    } else if (hasPlusOne) {
      config = { bg: 'bg-green-100', text: 'text-green-800', label: 'Has Plus-One' }
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  },

  // QR status
  qrStatus: (value: unknown, row: Record<string, unknown>): React.ReactNode => {
    const qrCode = (row.qrCodes as Array<{ status: string }>)?.[0]
    let config = { bg: 'bg-gray-100', text: 'text-gray-800', label: 'No QR Code' }

    if (qrCode) {
      if (qrCode.status === 'USED') {
        config = { bg: 'bg-red-100', text: 'text-red-800', label: 'Used' }
      } else if (qrCode.status === 'SENT') {
        config = { bg: 'bg-green-100', text: 'text-green-800', label: 'Sent' }
      } else if (qrCode.status === 'GENERATED') {
        config = { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Generated' }
      } else if (qrCode.status === 'CREATED') {
        config = { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Created' }
      } else if (qrCode.status === 'EXPIRED') {
        config = { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Expired' }
      } else {
        config = { bg: 'bg-gray-100', text: 'text-gray-800', label: qrCode.status }
      }
    }

    return (
      <div className="flex items-center">
        <QrCode className="w-4 h-4 text-gray-400 mr-2" />
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>
    )
  },

  // Survey status
  surveyStatus: (value: unknown, row: Record<string, unknown>): React.ReactNode => {
    const surveyInvitation = (row.invitations as Array<{ type: string; status: string }>)?.find((inv) => inv.type === 'SURVEY')
    let config = { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Not Sent' }

    if (surveyInvitation) {
      if (surveyInvitation.status === 'SENT') {
        config = { bg: 'bg-green-100', text: 'text-green-800', label: 'Sent' }
      } else if (surveyInvitation.status === 'OPENED') {
        config = { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Opened' }
      } else if (surveyInvitation.status === 'RESPONDED') {
        config = { bg: 'bg-green-100', text: 'text-green-800', label: 'Responded' }
      } else {
        config = { bg: 'bg-yellow-100', text: 'text-yellow-800', label: surveyInvitation.status }
      }
    }

    return (
      <div className="flex items-center">
        <BarChart3 className="w-4 h-4 text-gray-400 mr-2" />
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>
    )
  },

  // Save the Date status
  saveTheDateStatus: (invitation: unknown): React.ReactNode => {
    if (!invitation) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
          Not Sent
        </span>
      )
    }

    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      'SENT': { bg: 'bg-green-100', text: 'text-green-800', label: 'Sent' },
      'PENDING': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Not Sent' },
      'GUEST': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Guest' },
      'FAILED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' }
    }

    const config = statusConfig[(invitation as { status: string }).status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: (invitation as { status: string }).status || 'Unknown' }

    return (
      <div className="flex items-center">
        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>
    )
  },

  // Actions - This needs to be used with a custom render function that has access to onRowAction
  actions: (value: unknown, row: Record<string, unknown>, onRowAction?: (action: string, row: Record<string, unknown>) => void): React.ReactNode => (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onRowAction?.('view', row)}
        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
        title="View"
      >
        <Eye className="w-4 h-4" />
      </button>
      <button
        onClick={() => onRowAction?.('edit', row)}
        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
        title="Edit"
      >
        <Edit className="w-4 h-4" />
      </button>
      <button
        onClick={() => onRowAction?.('delete', row)}
        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
} 