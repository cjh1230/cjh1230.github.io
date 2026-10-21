import { useHeaderBgOpacity } from './hooks'

export function BluredBackground() {
  const opacity = useHeaderBgOpacity()

  return (
    <div
      className="absolute inset-0 -z-1 bg-primary border-b border-primary transform-gpu"
      style={{
        opacity,
      }}
    ></div>
  )
}
