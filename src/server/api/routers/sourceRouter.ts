import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { searchForSource } from '~/services/sourceService';

const sourceRouter = createTRPCRouter({
  getSourceData: publicProcedure
    .input(z.object({ searchText: z.string().min(1) }))
    .query(({ input }) => searchForSource(input.searchText)),
});

export default sourceRouter;
