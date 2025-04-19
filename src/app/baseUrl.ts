export const backendUrl = () => {
    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3000'
    } else {
        return 'https://my-backend-app-vkiq.onrender.com'
    }
}