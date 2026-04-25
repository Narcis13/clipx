export interface PostComment {
  author: string;
  handle: string;
  text: string;
}

export interface PostContext {
  url: string;
  author: string;
  handle: string;
  text: string;
  postedAt: string;
  metrics: {
    views: number;
    replies: number;
    reposts: number;
    likes: number;
  };
  topComments: PostComment[];
}

export interface ReplyResponse {
  reply: string;
}
