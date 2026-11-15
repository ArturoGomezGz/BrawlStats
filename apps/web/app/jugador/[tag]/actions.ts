'use server';

import { revalidatePath } from 'next/cache';
import { setFollow } from '../../../lib/api';

export async function toggleFollow(formData: FormData) {
  const tag = String(formData.get('tag'));
  const follow = formData.get('follow') === 'true';
  await setFollow(tag, follow);
  revalidatePath(`/jugador/${tag}`);
}
