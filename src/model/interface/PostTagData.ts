export interface PostTagData {
  cr1bb_data_website_ecommerceid?: string;
  cr1bb_img_url?: string;
  cr1bb_title?: string;
  cr1bb_header?: string;
  cr1bb_excerpt?: string;
  cr1bb_content?: string;
  cr1bb_img_content?: string;
  cr1bb_tags?: string;
  createdon?: string;
  cr1bb_content2?: string;
  cr1bb_linkfileembedded?: string;
}

export interface ClientComponentProps {
  children: (props: {
    tagName: string | null | undefined;
    postId: string | null | undefined;
    posts: PostTagData[];
    loading: boolean;
    error: string | null;
  }) => React.ReactNode;
} 