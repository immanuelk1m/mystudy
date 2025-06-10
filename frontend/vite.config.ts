import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // NOTE: /data/content/*.json 과 같은 정적 자산 요청이 잘못된 HTML 응답을 반환하는 경우,
  // 이는 Vite의 SPA 폴백 동작(기본값 appType: 'spa')과 관련이 있을 수 있습니다.
  // 'public' 디렉토리가 올바르게 구성되고 접근 가능한지 확인하세요.
  // 문제가 지속되면 다음을 고려하십시오:
  // 1. 서버 로그를 확인하여 요청이 어떻게 처리되는지 확인합니다.
  // 2. 필요한 경우 `appType: 'custom'`으로 명시적으로 설정하고 미들웨어를 구성하여
  //    정적 자산 및 SPA 폴백을 올바르게 처리합니다.
  //    참고: https://vitejs.dev/config/app-options.html#apptype
  //         https://vitejs.dev/guide/backend-integration.html
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
