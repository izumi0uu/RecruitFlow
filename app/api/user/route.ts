import { getUser } from '@/lib/db/queries';
export const GET = async () => {
    const user = await getUser();
    return Response.json(user);
};
