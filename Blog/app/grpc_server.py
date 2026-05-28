import grpc
from grpc import aio

import blog_pb2
import blog_pb2_grpc
from app.database import get_db
from app.repository import BlogRepository
from app.config import settings


def _to_blog_message(blog: dict, user_id: int = 0) -> blog_pb2.Blog:
    likes = blog.get("likes", [])
    return blog_pb2.Blog(
        id=blog["id"],
        title=blog["title"],
        description=blog["description"],
        created_at=blog["created_at"].isoformat(),
        author_id=blog["author_id"],
        likes_count=len(likes),
        liked_by_me=(user_id in likes) if user_id else False,
        images=[
            blog_pb2.BlogImage(
                id=img["id"],
                url=f"{settings.base_url}/uploads/{img['filename']}",
            )
            for img in blog.get("images", [])
        ],
    )


class BlogServicer(blog_pb2_grpc.BlogServiceServicer):
    async def GetBlog(self, request, context):
        db = get_db()
        repo = BlogRepository(db)
        blog = await repo.get_by_id(request.blog_id)
        if not blog:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Blog not found")
            return
        return blog_pb2.GetBlogResponse(
            blog=_to_blog_message(blog, request.user_id)
        )

    async def GetBlogsByAuthorIds(self, request, context):
        db = get_db()
        repo = BlogRepository(db)
        blogs = await repo.get_by_author_ids(list(request.author_ids))
        return blog_pb2.GetBlogsByAuthorIdsResponse(
            blogs=[_to_blog_message(b) for b in blogs]
        )


async def serve(port: int) -> aio.Server:
    server = aio.server()
    blog_pb2_grpc.add_BlogServiceServicer_to_server(BlogServicer(), server)
    server.add_insecure_port(f"[::]:{port}")
    await server.start()
    return server
