'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { BIMOJI_CHARACTERS } from './characters.mjs'

export default function CharacterSelectModal({ open, initialCharacterId = '', onClose, onSaved }) {
  const [selectedId, setSelectedId] = useState(initialCharacterId)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (open) {
      setSelectedId(initialCharacterId)
      setSaveError('')
    }
  }, [open, initialCharacterId])

  useEffect(() => {
    if (!open) return undefined
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const handleSave = async () => {
    if (!selectedId || isSaving) return
    setIsSaving(true)
    setSaveError('')
    try {
      const response = await fetch('/api/user/bimoji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: selectedId }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.error || 'Unable to save your character.')
      }
      onSaved?.(selectedId)
    } catch (error) {
      setSaveError(error?.message || 'Unable to save your character.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className='fixed inset-0 z-[1300] flex items-end justify-center bg-slate-950/60 backdrop-blur-[2px] sm:items-center sm:p-4'
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
      role='dialog'
      aria-modal='true'
      aria-label='Choose your OCPrimes character'
    >
      <div className='flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-18px_50px_rgba(2,6,23,0.35)] sm:max-h-[85vh] sm:max-w-lg sm:rounded-[28px] sm:pb-5 sm:shadow-[0_30px_80px_rgba(2,6,23,0.45)]'>
        <div className='flex shrink-0 justify-center pt-3 sm:hidden'>
          <span className='h-1.5 w-10 rounded-full bg-slate-200' />
        </div>

        <div className='shrink-0 px-6 pb-3 pt-4 text-center'>
          <p className='text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-500'>
            OCPrimes ID
          </p>
          <h2 className='mt-1 text-xl font-bold tracking-tight text-slate-900'>
            Choose your character
          </h2>
          <p className='mt-1 text-sm text-slate-500'>
            Pick the one that feels like you. You can switch anytime.
          </p>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-5'>
          <div className='grid grid-cols-3 gap-3 pb-4 pt-1'>
            {BIMOJI_CHARACTERS.map((character) => {
              const isSelected = selectedId === character.id
              return (
                <button
                  key={character.id}
                  type='button'
                  onClick={() => setSelectedId(character.id)}
                  aria-pressed={isSelected}
                  className={`group relative overflow-hidden rounded-2xl border-2 bg-slate-50 p-1.5 transition-all ${
                    isSelected
                      ? 'border-indigo-500 shadow-[0_10px_24px_rgba(79,70,229,0.28)]'
                      : 'border-transparent'
                  }`}
                >
                  <span className='block overflow-hidden rounded-xl'>
                    <Image
                      src={character.avatar}
                      alt={`${character.name} character`}
                      sizes='(max-width: 1024px) 30vw, 150px'
                      className='h-auto w-full scale-105 object-cover transition-transform group-active:scale-100'
                      placeholder='blur'
                    />
                  </span>
                  <span
                    className={`mt-1.5 block pb-0.5 text-center text-xs font-semibold ${
                      isSelected ? 'text-indigo-600' : 'text-slate-600'
                    }`}
                  >
                    {character.name}
                  </span>
                  {isSelected ? (
                    <span className='absolute right-2.5 top-2.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white shadow'>
                      <svg className='h-3 w-3' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' aria-hidden='true'>
                        <path strokeLinecap='round' strokeLinejoin='round' d='m5 13 4 4L19 7' />
                      </svg>
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className='shrink-0 border-t border-slate-100 px-5 pt-3'>
          {saveError ? (
            <p className='pb-2 text-center text-xs font-medium text-rose-600'>{saveError}</p>
          ) : null}
          <button
            type='button'
            onClick={handleSave}
            disabled={!selectedId || isSaving}
            className='w-full rounded-full bg-slate-900 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-white transition active:scale-[0.99] disabled:opacity-40'
          >
            {isSaving ? 'Saving…' : "That's me!"}
          </button>
          <button
            type='button'
            onClick={() => onClose?.()}
            className='mt-2 w-full py-2 text-center text-sm font-medium text-slate-500'
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
