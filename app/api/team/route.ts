import { getTeamForUser } from '@/lib/db/queries';
import { toQueryDto } from '@/lib/query/types';
export const GET = async () => {
    const team = await getTeamForUser();
    return Response.json(toQueryDto(team));
};
