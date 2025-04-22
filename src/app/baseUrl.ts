export const backendUrl = () => {
    if (process.env.NODE_ENV === 'development') {
      // return 'http://localhost:3000'
      return 'https://my-backend-app-vkiq.onrender.com'
    } else {
        // return 'https://my-backend-app-vkiq.onrender.com'
        return 'http://localhost:3000'

    }
}
