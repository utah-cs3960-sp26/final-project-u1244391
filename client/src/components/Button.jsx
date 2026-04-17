const variants = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
}

export default function Button({ children, variant = 'primary', fullWidth = false, className = '', ...props }) {
  return (
    <button
      className={`rounded-lg px-6 py-3 font-bold text-lg transition-colors min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
