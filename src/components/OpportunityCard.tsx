import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Briefcase, Calendar, ExternalLink, MoreVertical, Pencil, Copy, Trash2, Tag, X, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import type { Opportunity } from "./OpportunityModal";

const FROZEN_TAG = "🧊 FROZEN";

// Flag images
import flagBR from "@/assets/flags/br.png";
import flagPT from "@/assets/flags/pt.png";
import flagDE from "@/assets/flags/de.png";
import flagES from "@/assets/flags/es.png";
import flagIE from "@/assets/flags/ie.png";
import flagNL from "@/assets/flags/nl.png";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick: () => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (opportunity: Opportunity) => void;
  onUpdateTags?: (id: string, tags: string[]) => void;
  onUpdateRole?: (id: string, role: string) => void;
  onFreeze?: (id: string, frozen: boolean) => void;
  allTags?: string[];
}

const FLAG_MAP: Record<string, { flag: string; name: string }> = {
  brazil: { flag: flagBR, name: "Brazil" },
  brasil: { flag: flagBR, name: "Brazil" },
  portugal: { flag: flagPT, name: "Portugal" },
  germany: { flag: flagDE, name: "Germany" },
  alemanha: { flag: flagDE, name: "Germany" },
  spain: { flag: flagES, name: "Spain" },
  espanha: { flag: flagES, name: "Spain" },
  ireland: { flag: flagIE, name: "Ireland" },
  irlanda: { flag: flagIE, name: "Ireland" },
  netherlands: { flag: flagNL, name: "Netherlands" },
  holanda: { flag: flagNL, name: "Netherlands" },
};

const getCountryFlag = (location: string | null) => {
  if (!location) return null;
  const lowerLocation = location.toLowerCase();
  for (const [key, value] of Object.entries(FLAG_MAP)) {
    if (lowerLocation.includes(key)) {
      return value;
    }
  }
  return null;
};

const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const WORK_MODEL_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

const SENIORITY_LABELS: Record<string, string> = {
  entry: "Entry",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
  principal: "Principal",
  director: "Director",
  vp: "VP",
};

// Smart tag suggestions based on company/role
const getSmartTagSuggestions = (opportunity: Opportunity): string[] => {
  const suggestions: string[] = [];
  const companyLower = opportunity.company_name.toLowerCase();
  const roleLower = opportunity.role_title.toLowerCase();
  
  // Role-based tags
  if (roleLower.includes("growth")) suggestions.push("Growth PM");
  if (roleLower.includes("technical") || roleLower.includes("platform")) suggestions.push("Technical PM");
  if (roleLower.includes("senior")) suggestions.push("Senior Role");
  if (roleLower.includes("lead") || roleLower.includes("principal")) suggestions.push("Leadership");
  if (roleLower.includes("data")) suggestions.push("Data PM");
  if (roleLower.includes("ai") || roleLower.includes("ml")) suggestions.push("AI/ML");
  if (roleLower.includes("mobile")) suggestions.push("Mobile");
  if (roleLower.includes("b2b")) suggestions.push("B2B");
  if (roleLower.includes("b2c")) suggestions.push("B2C");
  
  // Company type tags
  if (companyLower.includes("google") || companyLower.includes("meta") || companyLower.includes("amazon") || companyLower.includes("microsoft") || companyLower.includes("apple")) {
    suggestions.push("Big Tech");
  }
  
  // General useful tags
  suggestions.push("High Priority", "Follow Up", "Referral", "Direct Apply");
  
  return suggestions;
};

export const OpportunityCard = ({ 
  opportunity, 
  onClick, 
  onDelete, 
  onDuplicate,
  onUpdateTags,
  onUpdateRole,
  onFreeze,
  allTags = []
}: OpportunityCardProps) => {
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editedTag, setEditedTag] = useState("");
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editedRole, setEditedRole] = useState(opportunity.role_title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync editedRole when opportunity changes
  useEffect(() => {
    setEditedRole(opportunity.role_title);
  }, [opportunity.role_title]);

  const isFrozen = opportunity.tags?.includes(FROZEN_TAG) || false;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTag.trim() && onUpdateTags) {
      const currentTags = opportunity.tags || [];
      if (!currentTags.includes(newTag.trim())) {
        onUpdateTags(opportunity.id, [...currentTags, newTag.trim()]);
      }
      setNewTag("");
      setShowTagInput(false);
    }
    if (e.key === "Escape") {
      setNewTag("");
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (onUpdateTags) {
      const currentTags = opportunity.tags || [];
      onUpdateTags(opportunity.id, currentTags.filter(tag => tag !== tagToRemove));
    }
  };

  const handleEditTag = (index: number) => {
    const tags = opportunity.tags || [];
    setEditingTagIndex(index);
    setEditedTag(tags[index]);
  };

  const handleSaveEditedTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && editedTag.trim() && onUpdateTags && editingTagIndex !== null) {
      const currentTags = [...(opportunity.tags || [])];
      currentTags[editingTagIndex] = editedTag.trim();
      onUpdateTags(opportunity.id, currentTags);
      setEditingTagIndex(null);
      setEditedTag("");
    }
    if (e.key === "Escape") {
      setEditingTagIndex(null);
      setEditedTag("");
    }
  };

  const handleRoleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && editedRole.trim() && onUpdateRole) {
      onUpdateRole(opportunity.id, editedRole.trim());
      setIsEditingRole(false);
    }
    if (e.key === "Escape") {
      setEditedRole(opportunity.role_title);
      setIsEditingRole(false);
    }
  };

  const handleRoleBlur = () => {
    if (editedRole.trim() && editedRole !== opportunity.role_title && onUpdateRole) {
      onUpdateRole(opportunity.id, editedRole.trim());
    }
    setIsEditingRole(false);
  };

  // Get smart suggestions
  const smartSuggestions = getSmartTagSuggestions(opportunity);
  const combinedSuggestions = [...new Set([...smartSuggestions, ...allTags])];

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
          isDragging ? "opacity-50 shadow-lg" : ""
        } ${isFrozen ? "border-blue-400 bg-blue-50/50 dark:bg-blue-950/20" : "border-border"}`}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm truncate">{opportunity.company_name}</h4>
                <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                  <Briefcase className="h-3 w-3 flex-shrink-0" />
                  {isEditingRole ? (
                    <Input
                      value={editedRole}
                      onChange={(e) => setEditedRole(e.target.value)}
                      onKeyDown={handleRoleSubmit}
                      onBlur={handleRoleBlur}
                      className="h-5 text-xs px-1 py-0"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span 
                      className="truncate cursor-pointer hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onUpdateRole) setIsEditingRole(true);
                      }}
                    >
                      {opportunity.role_title}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {opportunity.job_url && (
                  <a 
                    href={opportunity.job_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary p-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onClick();
                    }}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {onDuplicate && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(opportunity);
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                    )}
                    {onFreeze && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onFreeze(opportunity.id, !isFrozen);
                        }}
                        className="text-blue-500 focus:text-blue-500"
                      >
                        <Snowflake className="h-4 w-4 mr-2" />
                        {isFrozen ? "Unfreeze Job" : "🧊 Freeze Job"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(true);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {isFrozen && (
                <Badge className="text-xs bg-blue-100 text-blue-600 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400">
                  🧊 FROZEN
                </Badge>
              )}
              {opportunity.seniority_level && (
                <Badge variant="secondary" className="text-xs">
                  {SENIORITY_LABELS[opportunity.seniority_level] || opportunity.seniority_level}
                </Badge>
              )}
              {opportunity.work_model && (
                <Badge variant="outline" className="text-xs">
                  {WORK_MODEL_LABELS[opportunity.work_model] || opportunity.work_model}
                </Badge>
              )}
              {opportunity.tags && opportunity.tags.filter(t => t !== FROZEN_TAG).slice(0, 2).map((tag, index) => (
                editingTagIndex === index ? (
                  <Input
                    key={`edit-${index}`}
                    value={editedTag}
                    onChange={(e) => setEditedTag(e.target.value)}
                    onKeyDown={handleSaveEditedTag}
                    onBlur={() => {
                      setEditingTagIndex(null);
                      setEditedTag("");
                    }}
                    placeholder="Edit tag..."
                    className="h-5 w-20 text-xs px-1 py-0"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <Badge 
                    key={tag} 
                    variant="default" 
                    className="text-xs bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onUpdateTags) handleEditTag(index);
                    }}
                  >
                    <Tag className="h-2.5 w-2.5 mr-0.5" />
                    {tag}
                    {onUpdateTags && (
                      <button
                        className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(tag);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                )
              ))}
              {opportunity.tags && opportunity.tags.filter(t => t !== FROZEN_TAG).length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{opportunity.tags.filter(t => t !== FROZEN_TAG).length - 2}
                </Badge>
              )}
              
              {/* Add tag button */}
              {onUpdateTags && !showTagInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTagInput(true);
                  }}
                >
                  <Tag className="h-3 w-3 mr-0.5" />
                  + TAG
                </Button>
              )}
              
              {showTagInput && (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleAddTag}
                    onBlur={() => {
                      // Delay to allow clicking suggestions
                      setTimeout(() => {
                        setNewTag("");
                        setShowTagInput(false);
                      }, 200);
                    }}
                    placeholder="New tag..."
                    className="h-5 w-24 text-xs px-1 py-0"
                    autoFocus
                  />
                  {/* Smart tag suggestions dropdown */}
                  <div className="absolute top-6 left-0 z-50 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto min-w-[140px]">
                    {combinedSuggestions
                      .filter(tag => 
                        !opportunity.tags?.includes(tag) && 
                        tag !== FROZEN_TAG &&
                        (newTag === "" || tag.toLowerCase().includes(newTag.toLowerCase()))
                      )
                      .slice(0, 8)
                      .map(tag => (
                        <button
                          key={tag}
                          className="w-full px-2 py-1.5 text-xs text-left hover:bg-muted transition-colors flex items-center gap-1"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onUpdateTags) {
                              const currentTags = opportunity.tags || [];
                              onUpdateTags(opportunity.id, [...currentTags, tag]);
                            }
                            setNewTag("");
                            setShowTagInput(false);
                          }}
                        >
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {tag}
                        </button>
                      ))}
                    {combinedSuggestions.filter(tag => 
                      !opportunity.tags?.includes(tag) && 
                      tag !== FROZEN_TAG &&
                      (newTag === "" || tag.toLowerCase().includes(newTag.toLowerCase()))
                    ).length === 0 && newTag && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Press Enter to create "{newTag}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {(opportunity.location || opportunity.next_action_date) && (
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {opportunity.location && (
                  <div className="flex items-center gap-1">
                    {(() => {
                      const countryInfo = getCountryFlag(opportunity.location);
                      return countryInfo ? (
                        <img 
                          src={countryInfo.flag} 
                          alt={countryInfo.name} 
                          className="w-4 h-3 object-cover rounded-sm"
                        />
                      ) : null;
                    })()}
                    <span className="truncate max-w-20">{capitalizeFirstLetter(opportunity.location)}</span>
                  </div>
                )}
                {opportunity.next_action_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(opportunity.next_action_date).toLocaleDateString("en-US")}</span>
                  </div>
                )}
              </div>
            )}

            {opportunity.match_score && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        opportunity.match_score >= 80 
                          ? "bg-success" 
                          : opportunity.match_score >= 50 
                            ? "bg-warning" 
                            : "bg-destructive"
                      }`}
                      style={{ width: `${opportunity.match_score}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{opportunity.match_score}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete opportunity?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the opportunity at <strong>{opportunity.company_name}</strong> ({opportunity.role_title})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (onDelete) {
                  onDelete(opportunity.id);
                }
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
