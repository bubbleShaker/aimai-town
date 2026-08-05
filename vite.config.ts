import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages では https://<user>.github.io/aimai-town/ の下に置かれるため、
  // 生成される asset の URL をサブパス起点にする
  base: '/aimai-town/',
})
