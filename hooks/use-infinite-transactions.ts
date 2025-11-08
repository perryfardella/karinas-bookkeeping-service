'use client'

import { useEffect, useRef, useSyncExternalStore, useState, useMemo } from 'react'
import { TransactionFilters } from '@/components/transaction-filters'

export type TransactionWithDetails = {
  id: number
  bank_account_id: number
  date: string
  amount: number
  description: string
  category_id: number
  transfer_to_account_id: number | null
  bank_account: {
    id: number
    name: string
  }
  category: {
    id: number
    name: string
    parent_id: number | null
  }
  transfer_to_account: {
    id: number
    name: string
  } | null
  running_balance: number
}

interface StoreState {
  data: TransactionWithDetails[]
  count: number
  isSuccess: boolean
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  hasInitialFetch: boolean
  hasMore: boolean // Track if there are more pages to load
}

type Listener = () => void

interface UseInfiniteTransactionsProps {
  pageSize?: number
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  filters?: TransactionFilters
}

function createStore(props: UseInfiniteTransactionsProps) {
  const { pageSize = 20, sortField = 'date', sortDirection = 'desc', filters = {} } = props

  let state: StoreState = {
    data: [],
    count: 0,
    isSuccess: false,
    isLoading: false,
    isFetching: false,
    error: null,
    hasInitialFetch: false,
    hasMore: true, // Assume there's more until we know otherwise
  }

  const listeners = new Set<Listener>()

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const setState = (newState: Partial<StoreState>) => {
    state = { ...state, ...newState }
    notify()
  }

  const fetchPage = async (skip: number) => {
    // Don't fetch if already fetching or if we know there are no more pages
    if (state.hasInitialFetch && (state.isFetching || !state.hasMore)) return

    setState({ isFetching: true })

    try {
      const params = new URLSearchParams({
        page: Math.floor(skip / pageSize) + 1 + '',
        pageSize: pageSize.toString(),
        sortField,
        sortDirection,
        ...(filters.bank_account_ids && {
          bank_account_ids: filters.bank_account_ids.join(','),
        }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.category_ids && {
          category_ids: filters.category_ids.join(','),
        }),
        ...(filters.min_amount !== undefined && {
          min_amount: filters.min_amount.toString(),
        }),
        ...(filters.max_amount !== undefined && {
          max_amount: filters.max_amount.toString(),
        }),
        ...(filters.search && { search: filters.search }),
      })

      const response = await fetch(`/api/transactions?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const result = await response.json()
      const newTransactions = result.transactions || []
      const totalCount = result.count || 0

      // Deduplicate transactions by ID to prevent duplicate keys
      const existingIds = new Set(state.data.map(t => t.id))
      const uniqueNewTransactions = newTransactions.filter(t => !existingIds.has(t.id))

      // Determine if there are more pages:
      // 1. If we got fewer transactions than requested, we've reached the end
      // 2. If we got 0 unique new transactions (all were duplicates), we've reached the end
      // 3. Otherwise, check if we have fewer total transactions than the count
      const receivedFewerThanRequested = newTransactions.length < pageSize
      const noNewUniqueTransactions = uniqueNewTransactions.length === 0 && state.data.length > 0
      const hasMorePages = !receivedFewerThanRequested && !noNewUniqueTransactions && state.data.length + uniqueNewTransactions.length < totalCount

      setState({
        data: [...state.data, ...uniqueNewTransactions],
        count: totalCount,
        isSuccess: true,
        error: null,
        hasMore: hasMorePages,
      })
    } catch (err) {
      setState({
        error: err instanceof Error ? err : new Error('Failed to fetch transactions'),
        hasMore: false, // Stop trying on error
      })
    } finally {
      setState({ isFetching: false })
    }
  }

  const fetchNextPage = async () => {
    if (state.isFetching) return
    await fetchPage(state.data.length)
  }

  const reset = async () => {
    setState({
      data: [],
      count: 0,
      hasInitialFetch: false,
      isSuccess: false,
      hasMore: true, // Reset to true when resetting
    })
    // Reinitialize after reset
    await initialize()
  }

  const initialize = async () => {
    setState({ isLoading: true, isSuccess: false, data: [] })
    await fetchNextPage()
    setState({ isLoading: false, hasInitialFetch: true })
  }

  const updateData = (updater: (data: TransactionWithDetails[]) => TransactionWithDetails[]) => {
    setState({
      data: updater(state.data),
    })
  }

  return {
    getState: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    fetchNextPage,
    initialize,
    reset,
    updateData,
  }
}

const initialState: StoreState = {
  data: [],
  count: 0,
  isSuccess: false,
  isLoading: false,
  isFetching: false,
  error: null,
  hasInitialFetch: false,
  hasMore: true,
}

export function useInfiniteTransactions(props: UseInfiniteTransactionsProps) {
  const propsRef = useRef(props)
  const storeRef = useRef(createStore(props))
  const [propsKey, setPropsKey] = useState(0)
  const isResettingRef = useRef(false)
  
  // Memoize filters string to avoid unnecessary re-renders
  const filtersString = useMemo(() => JSON.stringify(props.filters || {}), [props.filters])
  const filtersStringRef = useRef(filtersString)

  // Check if props changed using useEffect to avoid render-time mutations
  useEffect(() => {
    const propsChanged =
      propsRef.current.pageSize !== props.pageSize ||
      propsRef.current.sortField !== props.sortField ||
      propsRef.current.sortDirection !== props.sortDirection ||
      filtersStringRef.current !== filtersString

    if (propsChanged && !isResettingRef.current) {
      propsRef.current = props
      filtersStringRef.current = filtersString
      storeRef.current = createStore(props)
      setPropsKey((k) => k + 1)
    }
  }, [props.pageSize, props.sortField, props.sortDirection, filtersString])

  const state = useSyncExternalStore(
    storeRef.current.subscribe,
    () => storeRef.current.getState(),
    () => initialState
  )

  useEffect(() => {
    if (!state.hasInitialFetch && typeof window !== 'undefined') {
      storeRef.current.initialize()
    } else if (propsKey > 0 && state.hasInitialFetch && !isResettingRef.current) {
      // Reset and reinitialize if props changed
      isResettingRef.current = true
      storeRef.current.reset().finally(() => {
        isResettingRef.current = false
      })
    }
  }, [propsKey, state.hasInitialFetch])

  return {
    data: state.data,
    count: state.count,
    isSuccess: state.isSuccess,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    error: state.error,
    hasMore: state.hasMore, // Use the tracked hasMore from state
    fetchNextPage: storeRef.current.fetchNextPage,
    reset: storeRef.current.reset,
    updateData: storeRef.current.updateData,
  }
}

