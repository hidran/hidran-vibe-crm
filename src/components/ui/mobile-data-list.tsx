import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileDataListProps<T> {
  data: T[];
  renderItem: (item: T) => ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function MobileDataList<T>({
  data,
  renderItem,
  isLoading,
  emptyMessage = "No items found",
  onLoadMore,
  hasMore,
  isLoadingMore,
}: MobileDataListProps<T>) {
  if (isLoading && data.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-muted/20">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index}>{renderItem(item)}</div>
        ))}
      </div>
      
      {hasMore && onLoadMore && (
        <div className="pt-4 flex justify-center">
          <Button 
            variant="outline" 
            onClick={onLoadMore} 
            disabled={isLoadingMore}
            className="w-full"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}