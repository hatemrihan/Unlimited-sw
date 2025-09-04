"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className = ""
}: DatePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)

  const formatDate = (date: Date | undefined) => {
    if (!date) return placeholder
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    onDateChange?.(newDate)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-full p-3 bg-transparent border border-white/20 rounded-lg text-white focus:border-white focus:outline-none flex items-center justify-between ${className}`}
        >
          <span className={selectedDate ? "text-white" : "text-gray-400"}>
            {formatDate(selectedDate)}
          </span>
          <CalendarIcon className="h-4 w-4 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
