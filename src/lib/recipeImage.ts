import { supabase } from '@/lib/supabase'
import { fileToCompressedDataUrl } from '@/lib/image'

const BUCKET = 'recipe-images'
const SIGNED_URL_TTL = 60 * 60

export async function uploadRecipeImage(opts: {
  file: File
  householdId: string
  recipeId: string
}): Promise<string> {
  const compressedDataUrl = await fileToCompressedDataUrl(opts.file)
  const blob = await dataUrlToBlob(compressedDataUrl)
  const path = `${opts.householdId}/${opts.recipeId}/${crypto.randomUUID()}.jpg`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

export async function getRecipeImageUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (error) return null
  return data?.signedUrl ?? null
}

export async function deleteRecipeImage(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}
