import axios from 'axios';

// Nota: Cambiar tambien el refresh
const apiClient = axios.create({
    baseURL: 'http://localhost:3000/', // https://www.sqlfacilito.cl/api  , /api
    timeout: 50000,
    headers: {
        'Content-Type': 'application/json',

    },
});


let isRefreshing = false;
let failedRequestsQueue = [];

// Función para añadir el accessToken a todas las peticiones
const addAccessToken = (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
        config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
};

// Interceptor antes de enviar la petición
apiClient.interceptors.request.use(addAccessToken, (error) => {
    return Promise.reject(error);
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Si hay un error 402 y no se está refrescando ya
        if (error.response?.status === 402 && !originalRequest._retry) {
            if (isRefreshing) {
                // Si ya se está refrescando, cola las peticiones
                return new Promise((resolve, reject) => {
                    failedRequestsQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    return axios(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');

                const response = await axios.post('http://localhost:3000/usuarios/refresh-token', {
                    refreshToken,
                });

                const newAccessToken = response.data.accessToken;

                // Guardar nuevo accessToken
                localStorage.setItem('accessToken', newAccessToken);

                // Reintentar la petición original
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                failedRequestsQueue.forEach(({ resolve }) => resolve(newAccessToken));
                failedRequestsQueue = [];
                isRefreshing = false;
                return axios(originalRequest);
            } catch (err) {
                // Si falla el refresh, limpiamos tokens y redirigimos
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                isRefreshing = false;
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);




export default apiClient;