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
import { getPeople, createPerson, deletePerson } from "@/lib/db"
import type { Person } from "@/types"
import { Plus, Trash2, Users } from "lucide-react"

export default function PersonasPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState("")

  const load = async () => {
    const p = await getPeople()
    setPeople(p)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    await createPerson({ name: name.trim() })

    setOpen(false)
    setName("")
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta persona? También se eliminarán sus ingresos y gastos.")) return
    await deletePerson(id)
    load()
  }

  if (loading) return <p className="text-muted-foreground">Cargando...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30">
            <Users className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Personas</h2>
            <p className="text-sm text-muted-foreground">Configuración de personas</p>
          </div>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v)
            if (!v) setName("")
          }}
        >
          <DialogTrigger
            render={(props) => <Button {...props}><Plus className="size-4 mr-2" />Nueva persona</Button>}
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva persona</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  placeholder="Nombre de la persona"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Crear persona
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {people.length} persona{people.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {people.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay personas registradas. Crea una para empezar.
            </p>
          ) : (
            <div className="space-y-2">
              {people.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-all duration-200 hover:shadow-sm hover:border-border/80"
                >
                  <span className="text-sm font-medium">{p.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-red-600"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
