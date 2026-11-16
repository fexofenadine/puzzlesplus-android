//true in the android app's build (vite --mode android), false on the web and in tests
export const app = import.meta.env?.MODE === 'android'
