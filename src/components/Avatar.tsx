import { thumb } from '../lib/cloudinary'

export function Avatar({ url, size = 32 }: { url: string; size?: number }) {
  return (
    <img
      src={thumb(url, size * 2)}
      alt=""
      className="rounded-full object-cover border-2 border-bijou-gold bg-bijou-ivory"
      style={{ width: size, height: size }}
    />
  )
}
