'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Search, Eye, Edit, Trash2, User, Mail, Building, QrCode, Calendar, BarChart3 } from 'lucide-react'

interface Column {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: any) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps {
  data: any[]
  columns: Column[]
  onRowSelect?: (selectedIds: Set<string>) => void
  onRowAction?: (action: string, row: any) => void
  selectable?: boolean
  searchable?: boolean
  pagination?: boolean
  itemsPerPage?: number
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export default function DataTable({
  data,
  columns,
  onRowSelect,
  onRowAction,
  selectable = false,
  searchable = false,
  pagination = false,
  itemsPerPage = 10,
  loading = false,
  emptyMessage = "No data available",
  className = ""
}: DataTableProps) {
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
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
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

  const renderCell = (column: Column, row: any) => {
    if (column.render) {
      return column.render(row[column.key], row)
    }
    return row[column.key] || '-'
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
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${column.width ? column.width : ''} ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className={`flex items-center ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : ''}`}>
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="ml-1">
                        {getSortIcon(column.key)}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`bg-white divide-y divide-gray-200 transition-all duration-150 ease-in-out ${
            isTransitioning ? 'opacity-50 blur-sm' : 'opacity-100 blur-0'
          }`}>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <User className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={row.id || index}
                  className={`hover:bg-gray-50 transition-colors duration-150 border-l-4 ${
                    selectedRows.has(row.id) ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'
                  }`}
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
                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                        column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {renderCell(column, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

            {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 font-medium">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1 || isTransitioning}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-white hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white text-gray-700 font-medium"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  disabled={isTransitioning}
                  className={`px-3 py-1.5 text-sm border rounded-md transition-colors font-medium ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'border-gray-300 hover:bg-white hover:border-gray-400 bg-white text-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages || isTransitioning}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-white hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white text-gray-700 font-medium"
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
  guest: (value: any, row: any) => (
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0 h-10 w-10">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-sm font-medium text-white">
            {row.firstName?.charAt(0)}{row.lastName?.charAt(0)}
          </span>
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">
          {row.firstName} {row.lastName}
        </div>
        <div className="text-sm text-gray-500 flex items-center">
          <Mail className="w-3 h-3 mr-1" />
          {row.email}
        </div>
        {row.company && (
          <div className="text-sm text-gray-400 flex items-center">
            <Building className="w-3 h-3 mr-1" />
            {row.company}
          </div>
        )}
      </div>
    </div>
  ),

  // Company with icon
  company: (value: any) => (
    <div className="flex items-center">
      <Building className="w-4 h-4 text-gray-400 mr-2" />
      <span className="text-sm text-gray-900">{value || 'No company'}</span>
    </div>
  ),

  // Status badge
  status: (value: any) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      'COMING': { bg: 'bg-green-100', text: 'text-green-800', label: 'Coming' },
      'COMING_WITH_PLUS_ONE': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Coming +1' },
      'NOT_COMING': { bg: 'bg-red-100', text: 'text-red-800', label: 'Not Coming' },
      'SENT': { bg: 'bg-green-100', text: 'text-green-800', label: 'Sent' },
      'RESPONDED': { bg: 'bg-green-100', text: 'text-green-800', label: 'Responded' },
      'PENDING': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Not Sent' },
      'GUEST': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Guest' },
      'USED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Used' },
      'ACTIVE': { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      'CREATED': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Created' },
      'EXPIRED': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Expired' },
      'INACTIVE': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' }
    }

    const config = statusConfig[value] || { bg: 'bg-gray-100', text: 'text-gray-800', label: value || 'No Response' }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  },

  // VIP status
  vip: (value: any) => (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
      value ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
    }`}>
      {value ? 'VIP' : 'Regular'}
    </span>
  ),

  // Plus-one status
  plusOne: (value: any, row: any) => {
    const isPlusOne = row.isPlusOne
    const hasPlusOne = row.invitations?.[0]?.hasPlusOne

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
  qrStatus: (value: any, row: any) => {
    const qrCode = row.qrCodes?.[0]
    let config = { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' }

    if (qrCode) {
      if (qrCode.status === 'USED') {
        config = { bg: 'bg-red-100', text: 'text-red-800', label: 'Used' }
      } else if (qrCode.status === 'ACTIVE') {
        config = { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' }
      } else if (qrCode.status === 'CREATED') {
        config = { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Created' }
      } else if (qrCode.status === 'EXPIRED') {
        config = { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Expired' }
      } else {
        config = { bg: 'bg-yellow-100', text: 'text-yellow-800', label: qrCode.status }
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
  surveyStatus: (value: any, row: any) => {
    const surveyInvitation = row.invitations?.find((inv: any) => inv.type === 'SURVEY')
    let config = { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Not Sent' }

    if (surveyInvitation) {
      if (surveyInvitation.status === 'SENT') {
        config = { bg: 'bg-green-100', text: 'text-green-800', label: 'Sent' }
      } else if (surveyInvitation.status === 'OPENED') {
        config = { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Opened' }
      } else if (surveyInvitation.status === 'RESPONDED') {
        config = { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Responded' }
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
  saveTheDateStatus: (invitation: any) => {
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

    const config = statusConfig[invitation.status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: invitation.status || 'Unknown' }

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
  actions: (value: any, row: any, onRowAction?: (action: string, row: any) => void) => (
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