import { getCurrentUser } from '@/lib/db/queries';
import { toQueryDto } from '@/lib/query/types';
export const GET = async () => {
    const user = await getCurrentUser();
    return Response.json(toQueryDto(user));
};
