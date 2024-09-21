export interface Database {
  public: {
    Tables: {
      feedback: {
        Row: {
          id: number
          feedback_type: string
          title: string
          description: string
          timestamp: string
        }
        Insert: {
          id?: number
          feedback_type: string
          title: string
          description: string
          timestamp?: string
        }
        Update: {
          id?: number
          feedback_type?: string
          title?: string
          description?: string
          timestamp?: string
        }
      }
    }
  }
}