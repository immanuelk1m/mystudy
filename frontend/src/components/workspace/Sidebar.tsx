import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, File, FolderOpen, Save } from 'lucide-react';
import { useGuest } from '@/contexts/GuestContext';
import { useModal } from '@/contexts/ModalContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define types for props
interface TreeItemProps {
  notebookId: string;
  selectedChapter: string | null;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: TreeItemProps[];
  depth?: number;
}

interface SidebarProps {
  notebookId: string;
  selectedChapter: string | null;
  fileStructure: TreeItemProps[];
  aiOutline: Array<{ title: string; id: string }>;
  notebookTitle: string | null;
}

const TreeItem = ({ notebookId, selectedChapter, name, type, path, children, depth = 0 }: TreeItemProps) => {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();

  const handleClick = () => {
    if (type === 'folder') {
      setExpanded(!expanded);
    } else {
      navigate(`/workspace/${notebookId}?chapter=${path}`);
    }
  };

  const isSelected = selectedChapter === path;

  return (
    <div className="text-sm">
      <div
        className={`
          flex items-center gap-1 py-1 rounded-md hover:bg-accent cursor-pointer
          ${isSelected ? 'bg-accent font-semibold' : ''}
        `}
        style={{ paddingLeft: `${depth * 8}px` }}
        onClick={handleClick}
      >
        {type === 'folder' ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <span style={{ paddingLeft: `24px` }}>
            <File className="h-4 w-4 text-muted-foreground" />
          </span>
        )}

        <span className="truncate">{name}</span>
      </div>

      {expanded && children && (
        <div>
          {children.map((child, index) => (
            <TreeItem
              key={`${path}-${index}`}
              notebookId={notebookId}
              selectedChapter={selectedChapter}
              name={child.name}
              type={child.type}
              path={child.path} // Use child's path directly
              children={child.children}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ notebookId, selectedChapter, fileStructure, aiOutline, notebookTitle }: SidebarProps) => {
  const { isGuest } = useGuest();
  const { openModal } = useModal();

  const handleSaveClick = () => {
    if (isGuest) {
      openModal('authModal');
    } else {
      console.log('프로젝트 저장');
    }
  };

  const handleOutlineClick = (outlineId: string) => {
    console.log("Clicked AI Outline item:", outlineId);
  };

  return (
    <div className="h-full border-r">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold truncate">{notebookTitle || `Notebook ${notebookId}`}</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSaveClick}
                  className={isGuest ? "cursor-not-allowed opacity-50" : ""}
                >
                  <Save className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              {isGuest && (
                <TooltipContent>
                  <p>정식 사용자에게만 제공되는 기능입니다. 회원가입 후 이용해주세요.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
        {selectedChapter && (
          <p className="text-xs text-muted-foreground mt-1">챕터: {selectedChapter}</p>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-2">파일 구조</h3>
          {fileStructure.length > 0 ? (
            fileStructure.map((item, index) => (
              <TreeItem
                key={`structure-${index}`}
                notebookId={notebookId}
                selectedChapter={selectedChapter}
                name={item.name}
                type={item.type}
                path={item.path}
                children={item.children}
                depth={0}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">파일 구조 없음</p>
          )}
        </div>

        {aiOutline && aiOutline.length > 0 && (
          <div className="p-4 border-t mt-4">
            <h3 className="text-sm font-semibold mb-2">AI 개요</h3>
            {aiOutline.map((item) => (
              <div
                key={`outline-${item.id}`}
                className="text-sm py-1 rounded-md hover:bg-accent cursor-pointer truncate"
                onClick={() => handleOutlineClick(item.id)}
              >
                {item.title}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default Sidebar;