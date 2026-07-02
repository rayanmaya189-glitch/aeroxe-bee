import { useMemo } from 'react'

interface UsePaginationProps {
  total: number
  page: number
  pageSize: number
  siblingCount?: number
}

export function usePagination({ total, page, pageSize, siblingCount = 1 }: UsePaginationProps) {
  const totalPages = Math.ceil(total / pageSize)

  return useMemo(() => {
    const totalPageNumbers = siblingCount + 5
    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const leftSiblingIndex = Math.max(page - siblingCount, 1)
    const rightSiblingIndex = Math.min(page + siblingCount, totalPages)

    const showLeftDots = leftSiblingIndex > 2
    const showRightDots = rightSiblingIndex < totalPages - 2

    if (!showLeftDots && showRightDots) {
      const leftItemCount = 3 + 2 * siblingCount
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1)
      return [...leftRange, '...', totalPages]
    }

    if (showLeftDots && !showRightDots) {
      const rightItemCount = 3 + 2 * siblingCount
      const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1)
      return [1, '...', ...rightRange]
    }

    const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i)
    return [1, '...', ...middleRange, '...', totalPages]
  }, [total, page, pageSize, siblingCount, totalPages])
}
