"use client";

import {useEffect, useRef, useState} from "react";
import { Upload, Trash2 } from "lucide-react";
import BackButton from "@/app/components/BackButton";
import DateSelect from "@/app/components/DateSelect";
import { Pencil, X } from "lucide-react";
import EditClassModal from "@/app/components/EditClassModal";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [absentees, setAbsentees] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showMobileEditModal, setShowMobileEditModal] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch("/api/students/classes", {credentials: "include",});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unbekannter Fehler");
      setClasses(result.classes);
    } catch (err) {
      console.error("Fehler beim Laden der Klassen:", err.message);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (showMobileEditModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showMobileEditModal]);

  const resetSporttag = async () => {
    const firstConfirm = window.confirm("⚠️ Bist du sicher, dass du ALLE Daten des Sporttags löschen möchtest?");
    if (!firstConfirm) return;

    const secondConfirm = window.prompt("Gib 'SPORTTAG ZURÜCKSETZEN' ein, um den Löschvorgang zu bestätigen:");
    if (secondConfirm !== "SPORTTAG ZURÜCKSETZEN") {
      alert("❌ Vorgang abgebrochen. Falsche Bestätigungseingabe.");
      return;
    }

    try {
      const response = await fetch("/api/reset-sporttag", {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Fehler beim Zurücksetzen");

      alert("✅ Sporttag wurde erfolgreich zurückgesetzt.");
      setClasses([]);
      setStudents([]);
    } catch (err) {
      alert("Fehler beim Zurücksetzen: " + err.message);
    }
  };


  const detectSeparator = (text) => text.includes(";") ? ";" : ",";

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const separator = detectSeparator(text);
      const lines = text.split("\n");
      if (lines.length < 2) return;

      const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
      const nachnameIndex = headers.indexOf("nachname");
      const vornameIndex = headers.indexOf("vorname");
      const geburtsdatumIndex = headers.indexOf("geburtstag");
      const anredeIndex = headers.indexOf("anrede");
      const klasseIndex = headers.indexOf("klasse");

      if ([nachnameIndex, vornameIndex, geburtsdatumIndex, anredeIndex, klasseIndex].includes(-1)) {
        alert("Die CSV-Datei enthält nicht alle erforderlichen Spalten!");
        return;
      }

      const parsedStudents = lines.slice(1).map((line) => {
        const values = line.split(separator).map(v => v.trim());
        const date_of_birth = convertDate(values[geburtsdatumIndex]);
        return {
          surname: values[nachnameIndex] || "",
          name: values[vornameIndex] || "",
          date_of_birth,
          gender: values[anredeIndex] === "Herr" ? "maennlich" : "weiblich",
          class_group: values[klasseIndex] || "",
          assistant_bool: false,
          present_bool: true,
        };
      }).filter(student => student.surname && student.name && student.class_group);

      const uploadedClasses = [...new Set(parsedStudents.map(s => s.class_group))];
      const existing = uploadedClasses.filter(cls => classes.includes(cls));

      if (existing.length > 0) {
        alert(`Die Klasse "${existing[0]}" existiert bereits und kann nicht erneut hochgeladen werden.`);
        return;
      }

      setStudents(parsedStudents);
    };

    reader.readAsText(uploadedFile);
  };

  const convertDate = (dateStr) => {
    if (!dateStr) return null;
    let delimiter = dateStr.includes("/") ? "/" : ".";
    const parts = dateStr.split(delimiter);
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {
    if (students.length === 0) {
      alert("Keine Schülerdaten zum Hochladen!");
      return false;
    }
  
    setLoading(true);
  
    const updatedStudents = students.map((student, index) => ({
      ...student,
      assistant_bool: helpers.includes(index),
      present_bool: !absentees.includes(index),
    }));
  
    try {
      const res = await fetch("/api/students/upload", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedStudents),
      });
  
      const result = await res.json();
  
      if (!res.ok) throw new Error(result.error || "Fehler beim Speichern");
  
      await fetchClasses();
      alert("Erfolgreich gespeichert!");
      setStudents([]);
      setHelpers([]);
      setAbsentees([]);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
  
      // Sofort erfolgreich zurückkehren
      return true;
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
      alert("Fehler beim Hochladen: " + error.message);
      return false;
    } finally {
      setLoading(false);
  
      // Altersberechnung asynchron nachgelagert
      fetch("/api/students/recalculate-age", { method: "POST" })
        .then((res) => {
          if (!res.ok) throw new Error("Fehler beim Alters-Recalc");
          return res.json();
        })
        .catch((err) => console.error("Fehler beim Alters-Update:", err.message));
    }
  };

  const handleDeleteClassDirect = async (cls) => {
    const confirmDelete = window.confirm(`Möchtest du wirklich alle Schüler der Klasse ${cls} löschen?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch("/api/students/delete", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ class_group: cls }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Fehler beim Löschen:", result.error);
        alert("Fehler: " + result.error);
        return;
      }

      alert(`Alle Schüler der Klasse ${cls} wurden gelöscht.`);
      setClasses(classes.filter((c) => c !== cls));
    } catch (err) {
      console.error("Fehler beim Löschen der Klasse:", err);
    }
  };


  const handleEditClass = async (cls) => {
    try {
      const response = await fetch(`/api/students/by-class?class_group=${cls}`, {credentials: "include",});
      const json = await response.json();

      if (!response.ok || !json.data) {
        throw new Error(json.error || "Fehler beim Laden der Daten");
      }

      const data = json.data;

      if (!data.length) {
        alert(`Keine Schüler in Klasse ${cls} gefunden.`);
        return;
      }

      setStudents(data);
      setHelpers(data.map((s, i) => s.assistant_bool ? i : null).filter(i => i !== null));
      setAbsentees(data.map((s, i) => !s.present_bool ? i : null).filter(i => i !== null));
    } catch (error) {
      console.error("Fehler beim Laden der Klasse:", error);
      alert(`Fehler beim Laden: ${error.message}`);
    }
  };


  const toggleHelper = (index) => {
    if (!absentees.includes(index)) {
      setHelpers((prev) =>
          prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    }
  };

  const toggleAbsentee = (index) => {
    setAbsentees((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
    if (!absentees.includes(index)) {
      setHelpers((prev) => prev.filter((i) => i !== index));
    }
  };

  return (
      <div className="wrapper-container">
        <div className="transparent-container-upload gap-6 mb-15">
        <div className="basis-0 grow w-full flex flex-col sm:flex-row lg:flex-col items-center gap-6 sm:gap-4 lg:max-w-[260px]">
  {/* Klassenliste */}
  <div className="w-full bg-white bg-opacity-90 shadow-md rounded-2xl p-5 max-h-[400px] overflow-y-auto">
  <h3 className="text-xl font-semibold mb-6 text-gray-800 text-center">
    Schon hochgeladene Klassen:
  </h3>

  <ul className="space-y-4">
    {classes.map((cls) => (
      <li
        key={cls}
        className="flex justify-between items-center bg-gray-100 rounded-xl px-5 py-3 sm:py-2 text-base text-gray-900 shadow-sm"
      >
        <span className="font-medium truncate">{cls}</span>

        {/* DESKTOP Buttons */}
        <div className="hidden sm:flex gap-4">
          <button
            onClick={() => handleEditClass(cls)}
            title="Bearbeiten"
            className="flex items-center justify-center w-8 h-8 rounded-lg 
                       text-blue-600 hover:bg-blue-600 hover:text-white transition
                       border border-blue-500"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleDeleteClassDirect(cls)}
            title="Löschen"
            className="flex items-center justify-center w-8 h-8 rounded-lg 
                       text-red-600 hover:bg-red-600 hover:text-white transition
                       border border-red-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* MOBILE Button */}
        <div className="flex sm:hidden">
          <button
            onClick={() => setSelectedClass(cls)}
            className="text-sm text-blue-600 underline"
          >
            Optionen
          </button>
        </div>
      </li>
    ))}
  </ul>
</div>

  {/* Datumsauswahl */}
  <div className="w-full sm:w-auto">
    <DateSelect />
  </div>
          {/* Zurücksetzen Button */}
  <button
      onClick={resetSporttag}
      className="mt-4 w-full text-red-600 border border-red-600 hover:bg-red-600 hover:text-white transition px-4 py-2 rounded-lg flex items-center justify-center gap-2"
  >
    <Trash2 className="w-4 h-4" />
    Sporttag zurücksetzen
  </button>
</div>

          <div className="basis-0 grow w-full flex flex-col items-center gap-6">
            <h2 className="mid-title">Dashboard</h2>

            <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed w-full max-w-2xl h-32 flex flex-col items-center justify-center rounded-lg p-4 transition-all duration-200
                  ${dragActive ? "border-blue-700 bg-blue-50" : "border-blue-500"}`}
            >
              <Upload size={32} className="text-blue-600"/>
              <p className="text-gray-700 text-sm">Drag & Drop Klassenliste hier</p>
              <label className="mt-4 group relative inline-flex items-center gap-2 rounded-lg border border-blue-600 px-6 py-2 text-blue-600 transition-all duration-200 hover:bg-blue-600 hover:text-white hover:shadow-md focus:outline-none cursor-pointer">
                <span className="relative z-10 transition-colors duration-200 group-hover:text-white">
                  Datei suchen
                </span>
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              </label>
            </div>


            <div className="bg-white shadow-md rounded-lg p-4 max-h-[50dvh] overflow-y-auto w-full">
              <table className="hidden md:table w-full text-center border-collapse">
                <thead>
                <tr className="border-b border-gray-300">
                  <th className="p-2 text-gray-700">Name</th>
                  <th className="p-2 text-gray-700">Geschlecht</th>
                  <th className="p-2 text-gray-700">Klasse</th>
                  <th className="p-2 text-gray-700">Helfer</th>
                  <th className="p-2 text-gray-700">Abwesend</th>
                </tr>
                </thead>
                <tbody>
                {students.map((student, index) => (
                    <tr key={index} className="border-b border-gray-200 text-black">
                      <td className="p-2">{`${student.surname}, ${student.name}`}</td>
                      <td className="p-2">{student.gender}</td>
                      <td className="p-2">{student.class_group}</td>
                      <td className="p-2">
                        <button className={`helper-button ${helpers.includes(index) ? "active" : "inactive"} ${absentees.includes(index) ? "absent" : ""}`} onClick={() => toggleHelper(index)} disabled={absentees.includes(index)}>
                          Helfer
                        </button>
                      </td>
                      <td className="p-2 flex justify-center">
                        <button className={`absent-button ${absentees.includes(index) ? "active" : "inactive"}`} onClick={() => toggleAbsentee(index)} />
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
              <div className="md:hidden flex flex-col gap-4">
                {students.map((student, index) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-3 shadow-sm">
                      <p className={`text-lg font-medium ${absentees.includes(index) ? "text-gray-400 line-through" : "text-black"}`}>{student.name} {student.surname}</p>
                      <p className="text-gray-600">Klasse: {student.class_group} | Geschlecht: {student.gender}</p>
                      <div className="flex justify-between mt-2 items-center">
                        <button className={`helper-button ${helpers.includes(index) ? "active" : "inactive"} ${absentees.includes(index) ? "absent" : ""}`} onClick={() => toggleHelper(index)} disabled={absentees.includes(index)}>
                          Helfer
                        </button>
                        <button className={`absent-button ${absentees.includes(index) ? "active" : "inactive"}`} onClick={() => toggleAbsentee(index)} />
                      </div>
                    </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`group relative inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 px-6 py-2 text-blue-600 transition-all duration-200 focus:outline-none ${
                loading
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-blue-600 hover:text-white hover:shadow-md"
              }`}
            >
              <span className="relative z-10 transition-colors duration-200 group-hover:text-white">
                {loading ? "Speichert..." : "Speichern"}
              </span>
            </button>
          </div>
        </div>
        <BackButton/>
        {/* Modal ganz unten im JSX einfügen */}
        {selectedClass && !showMobileEditModal && (
<EditClassModal
  isOpen={!!selectedClass}
  className={selectedClass}
  onClose={() => setSelectedClass(null)}
  onEdit={async () => {
    await handleEditClass(selectedClass);
    setShowMobileEditModal(true); // Modal öffnen
  }}
  onDelete={() => {
    handleDeleteClassDirect(selectedClass);
    setSelectedClass(null);
  }}
/>
)}
{/* Mobiles Modal zur Klassenbearbeitung */}
{showMobileEditModal && (
  <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-semibold text-gray-900 text-center">
        Klasse {selectedClass} bearbeiten
      </h2>

      <div className="columns-2 gap-4">
  {students.map((student, index) => (
    <div
      key={index}
      className="break-inside-avoid border border-gray-300 rounded-lg p-3 shadow-sm mb-4"
    >
      <div>
        <p className={`text-lg font-medium ${absentees.includes(index) ? "text-gray-400 line-through" : "text-black"}`}>
          {student.name} {student.surname}
        </p>
        <p className="text-gray-600 text-sm">
          {student.class_group} | {student.gender}
        </p>
      </div>

      <div className="flex justify-between mt-2 items-center">
        <button
          className={`helper-button ${helpers.includes(index) ? "active" : "inactive"} ${absentees.includes(index) ? "absent" : ""}`}
          onClick={() => toggleHelper(index)}
          disabled={absentees.includes(index)}
        >
          Helfer
        </button>
        <button
          className={`absent-button ${absentees.includes(index) ? "active" : "inactive"}`}
          onClick={() => toggleAbsentee(index)}
        />
      </div>
    </div>
  ))}
</div>

      <div className="flex justify-end gap-4 pt-4">
        <button
          onClick={() => setShowMobileEditModal(false)}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:underline"
        >
          Abbrechen
        </button>

        <button
          onClick={async () => {
            const success = await handleSubmit();
            if (success) {
              setShowMobileEditModal(false);
              setSelectedClass(null);
            }
          }}
          disabled={loading}
          className={`group relative inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 px-6 py-2 text-blue-600 transition-all duration-200 focus:outline-none ${
            loading
              ? "opacity-60 cursor-not-allowed"
              : "hover:bg-blue-600 hover:text-white hover:shadow-md"
          }`}
        >
          <span className="relative z-10 transition-colors duration-200 group-hover:text-white">
            {loading ? "Speichert..." : "Speichern"}
          </span>
        </button>

      </div>
    </div>
  </div>
)}

      </div>
      
  );}
