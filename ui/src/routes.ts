import { createRootRoute, createRoute } from '@tanstack/react-router';
import MainPage from './components/MainPage';

const rootRoute = createRootRoute();

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: MainPage,
  loader: async ({ params: { _splat: searchText }, abortController }) =>
    searchText
      ? await fetch(`/api/search/${searchText}`, { signal: abortController.signal }).then(
          (response) => response.json() as Promise<{ name: string; id: string; imageUrl: string; link: string }>,
        )
      : undefined,
  errorComponent: MainPage,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export { routeTree, indexRoute };
