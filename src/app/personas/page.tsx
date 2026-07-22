"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getPeople, createPerson, updatePerson, deletePerson } from "@/lib/db"
import type { Person } from "@/types"
import { Plus, Trash2, Pencil, Users } from "lucide-react"
import { useLanguage } from "@/i18n/useLanguage"

export default function PersonasPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const { t } = useLanguage()
  const p = t.personas

  const load = async () => {
    const people = await getPeople()
    setPeople(people)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
    setName("")
    setOpen(true)
  }

  const openEdit = (person: Person) => {
    setEditing(person)
    setName(person.name)
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (editing) {
      await updatePerson(editing.id, { name: name.trim() })
    } else {
      await createPerson({ name: name.trim() })
    }
    setOpen(false)
    setName("")
    setEditing(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(p.deleteConfirm)) return
    await deletePerson(id)
    load()
  }

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>

  const countLabel = p.count.replace("{n}", String(people.length)).replace("{c}", people.length !== 1 ? "s" : "")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30">
            <Users className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{p.title}</h2>
            <p className="text-sm text-muted-foreground">{p.subtitle}</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) { setEditing(null); setName("") }; setOpen(v) }}>
          <DialogTrigger render={(props) => <Button {...props} onClick={openNew}><Plus className="size-4 mr-2" />{p.newPersona}</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? p.editTitle : p.newTitle}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{p.nombre}</Label>
                <Input id="name" placeholder={p.nombrePlaceholder} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">{editing ? p.guardarCambios : p.crearPersona}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{countLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {people.length === 0 ? (
            <p className="text-sm text-muted-foreground">{p.empty}</p>
          ) : (
            <div className="space-y-2">
              {people.map((person) => (
                <div key={person.id} className="flex items-center justify-between rounded-lg border p-3 transition-all duration-200 hover:shadow-sm hover:border-border/80">
                  <span className="text-sm font-medium">{person.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(person)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(person.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
