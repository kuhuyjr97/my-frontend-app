"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { backendUrl } from "@/app/baseUrl";
import { Types, TypeLabels } from "@/app/enums/types";
import { customStyle } from "@/app/style/custom-style";
import { useRouter } from "next/navigation";

import { CustomSelect } from "@/components/common/select";
import { CustomButton } from "@/components/common/button";
interface Note {
  id: number;
  title: string;
  content: string;
  type: number;
  createdAt: string;
  subType: number;
}

interface NoteType {
  id: number;
  value: string;
}

export default function NotesPage() {
  const baseUrl = backendUrl();
  const router = useRouter();

  const [notes, setNotes] = useState<Note[]>([]);
  const [noteTypes, setNoteTypes] = useState<NoteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubType, setSelectedSubType] = useState<number | null>(null);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNote, setEditedNote] = useState<Note | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalExpanded, setIsEditModalExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // customnote
  const [selectData, setSelectData] = useState<NoteType[]>([]);

  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createSubType, setCreateSubType] = useState(0);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSubType, setEditSubType] = useState(0);
  //

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem("token");
      if (!token) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }

      try {
        const check = await axios.get(`${baseUrl}/auth/check`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!check.data) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
      } catch (error) {
        console.log("error", error);
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
    }
    fetchNotes();
    fetchNoteTypes();
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSubType === null) {
      setFilteredNotes(notes);
    } else {
      const filtered = notes.filter((note) => note.subType === selectedSubType);
      setFilteredNotes(filtered);
    }
  }, [selectedSubType, notes]);

  const fetchNoteTypes = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`${baseUrl}/types/${Types.NOTE}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data.map((item: { subType: number; content: string }) => ({
        id: item.subType,
        value: item.content,
      }));
      setSelectData(data);
      setNoteTypes(data);
    } catch (err) {
      console.error("Error fetching note types:", err);
      setError("Failed to fetch note types");
    }
  };

  function getNoteType(type: number) {
    const asd = noteTypes.find((item) => {
      return Number(item.id) === type;
    });
    return asd?.value;
  }

  const fetchNotes = async () => {
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNotes(response.data);
      setFilteredNotes(response.data);
      setError("");
    } catch (err: unknown) {
      console.error("Error fetching notes:", err);
      setError("Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  };

 
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${baseUrl}/notes`,
        {
          title: createTitle,
          content: createContent,
          subType: createSubType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCreateTitle("");
      setCreateContent("");
      setCreateSubType(0);
      fetchNotes();
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      console.error("Error creating note:", err);
      setError("Failed to create note");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${baseUrl}/notes/${noteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      closeModal();
      fetchNotes();
    } catch (err: unknown) {
      console.error("Error deleting note:", err);
      setError("Failed to delete note");
    }
  };

  const handleEditNote = async () => {
    if (!editedNote) return;

    const token = localStorage.getItem("token");
    try {
      setIsSaving(true);
      await axios.patch(
        `${baseUrl}/notes/${editedNote.id}`,
        {
          title: editTitle,
          content: editContent,
          subType: editSubType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Close current modal
      closeModal();

      // Fetch all notes to update the list
      await fetchNotes();
    } catch (err: unknown) {
      console.error("Error editing note:", err);
      setError("Failed to edit note");
    } finally {
      setIsSaving(false);
    }
  };

  const openNoteModal = (note: Note) => {
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditSubType(note.subType);

    setSelectedNote(note);
    setEditedNote({ ...note });
    setIsModalOpen(true);
    setIsExpanded(false);
    setIsEditing(false);
    setShowMenu(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedNote(null);
    setEditedNote(null);
    setIsExpanded(false);
    setIsEditing(false);
    setShowMenu(false);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const startEditing = () => {
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleFilteredNotesBySubType = async (id: number) => {
    const token = localStorage.getItem("token");
    const filteredNotes =  await axios.get(
      `${baseUrl}/notes/${id}`, 
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    setFilteredNotes(filteredNotes.data || []);
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Notes</h1>
              <p className="mt-1 text-sm text-gray-400">
                Manage and organize your notes
              </p>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isCreating}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreating ? "Đang tạo..." : "Tạo ghi chú mới"}
            </Button>
          </div>

          {/* Filter Section */}
          <div className="bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-300">
                 Filter by sub type:
                </span>
                <CustomSelect
                  data={selectData}
                  onChange={(id) => {
                    handleFilteredNotesBySubType(id);
                  }}
                  placeholder="Select Note Type"
                />
                <CustomButton
                  text="All"
                  variant="outline"
                  className={`${customStyle.baseBg}`}
                  onClick={() => handleFilteredNotesBySubType(0)}
                />
              </div>

              {/* Stats Section */}
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="font-medium text-gray-100">
                    {filteredNotes.length}
                  </span>
                  <span>Notes</span>
                </span>
                {selectedSubType !== null && (
                  <span className="flex items-center gap-1">
                    <span>đang hiển thị</span>
                    <span className="font-medium text-gray-100">
                      {
                        noteTypes.find(
                          (t) => parseInt(t.id.toString()) === selectedSubType
                        )?.value
                      }
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notes List */}
          <div className={`space-y-4 ${customStyle.containerBg} p-5`}>
            {error && (
              <div className="bg-red-900/50 border-l-4 border-red-500 p-4 rounded-lg">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-600 mb-4">
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-100">
                  Không có ghi chú
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Bắt đầu bằng cách tạo một ghi chú mới.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => openNoteModal(note)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-100 mb-1">
                            {note.title}
                          </h3>
                          <p className="text-sm text-gray-400 mb-2">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            note.subType === 1
                              ? "bg-green-900/50 text-green-300"
                              : "bg-blue-900/50 text-blue-300"
                          }`}
                        >
                          {getNoteType(note.subType)}
                        </span>
                      </div>
                      <p className="text-gray-300 line-clamp-3">
                        {note.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Note Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-100">Create New Note</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the information of your new note. Click save when finished.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNote} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Note Title
              </label>
              <input
                type="text"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Content
              </label>
              <textarea
                value={createContent}
                onChange={(e) => setCreateContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Sub Type
              </label>

              <CustomSelect
                data={selectData}
                onChange={(id) => {
                  setCreateSubType(id); // ← đây là chỗ bạn lấy giá trị được chọn
                  console.log("Selected ID:", id);
                }}
                placeholder="Select Note Sub Type"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Create note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Note Modal */}
      {isModalOpen && selectedNote && (
        <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div
            className={`bg-gray-800 rounded-lg p-6 mx-4 transform transition-all duration-300 animate-fadeIn shadow-xl ${
              isEditModalExpanded ? "w-[90%] h-[90vh]" : "max-w-lg w-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle || ""}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-bold text-gray-100 border-b border-gray-700 bg-transparent focus:outline-none focus:border-blue-500 w-full"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-gray-100">
                    {selectedNote.title}
                  </h2>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditModalExpanded(!isEditModalExpanded)}
                  className="h-8 w-8 text-gray-400 hover:text-gray-100"
                >
                  {isEditModalExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="text-gray-400 hover:text-gray-100 transition-colors duration-300 p-1"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-700">
                      <button
                        onClick={startEditing}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNote(selectedNote.id)}
                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-100 transition-colors duration-300 p-1"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div
              className="prose max-w-none cursor-pointer"
              onClick={toggleExpand}
            >
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isEditModalExpanded ? "h-[500px]" : "h-[200px]"
                  }`}
                />
              ) : (
                <p
                  className={`text-gray-300 whitespace-pre-wrap ${
                    isEditModalExpanded ? "text-base" : "text-sm"
                  }  max-h-170 overflow-y-auto`}
                >
                  {selectedNote.content}
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-between items-center">
              {isEditing ? (
                <CustomSelect
                  data={selectData}
                  defaultValue={editedNote?.subType?.toString()}
                  onChange={(id) => {
                    setEditSubType(id); // ← đây là chỗ bạn lấy giá trị được chọn
                  }}
                  placeholder="Select Note Sub Type"
                />
              ) : (
                <span className="text-xs text-gray-400">
                  Type:{" "}
                  {noteTypes.find(
                    (t) => parseInt(t.id.toString()) === selectedNote.subType
                  )?.value || `Type ${selectedNote.subType}`}
                </span>
              )}
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleEditNote}
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 mr-2"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save</span>
                      )}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">
                    Created: {new Date(selectedNote.createdAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
