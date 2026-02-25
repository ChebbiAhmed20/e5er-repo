import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Users,
    MessageSquare,
    CreditCard,
    Globe,
    ShieldCheck,
    Mail,
    Phone,
    MapPin,
    Building2,
    CalendarDays,
    Search,
    RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { ClientRecord, LicenseInfo, AdminStats } from "@/types/dentist";
import { getAdminClients, getAdminStats, grantLicense } from "@/services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/* ── Helpers ───────────────────────────────────────────── */

const licenseColor = (status: LicenseInfo["status"]) => {
    switch (status) {
        case "active": return "bg-accent text-accent-foreground";
        case "trial": return "bg-secondary text-secondary-foreground";
        case "expired": return "bg-destructive text-destructive-foreground";
        default: return "bg-muted text-muted-foreground";
    }
};

const anim = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.08, duration: 0.4 },
});

/* ── Component ─────────────────────────────────────────── */

const Admin = () => {
    const { isAuthenticated, profile } = useAuth();
    const navigate = useNavigate();
    const [clients, setClients] = useState<ClientRecord[]>([]);
    const [statsData, setStatsData] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<ClientRecord | null>(null);
    const [granting, setGranting] = useState(false);
    const [search, setSearch] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        // Basic protection (DISABLED FOR NOW)
        /*
        if (!isAuthenticated) {
            navigate("/signin");
            return;
        }
        */

        const loadData = async () => {
            setLoading(true);
            try {
                const [clientsData, stats] = await Promise.all([
                    getAdminClients(),
                    getAdminStats()
                ]);
                setClients(clientsData);
                setStatsData(stats);
            } catch (err) {
                toast({
                    title: "Erreur",
                    description: "Impossible de charger les données d'administration.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [isAuthenticated, navigate, toast]);

    const filteredClients = clients.filter((c) => {
        const q = search.toLowerCase();
        return (
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q) ||
            (c.clinicName?.toLowerCase().includes(q) ?? false)
        );
    });

    const handleGrantLicense = async () => {
        if (!selected) return;
        setGranting(true);
        try {
            await grantLicense(selected.id);

            // Update local state
            setClients((prev) =>
                prev.map((c) =>
                    c.id === selected.id
                        ? { ...c, license: { ...c.license, status: "active", type: "full", activatedAt: new Date().toISOString(), expiresAt: null } }
                        : c,
                ),
            );

            toast({
                title: "Licence accordée ✅",
                description: `${selected.firstName} ${selected.lastName} a maintenant une licence complète.`
            });
            setSelected(null);
        } catch (err) {
            toast({
                title: "Erreur",
                description: "Impossible d'accorder la licence.",
                variant: "destructive"
            });
        } finally {
            setGranting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground">Chargement des données...</p>
            </div>
        );
    }

    const stats = [
        { label: "Total Dentistes", value: statsData?.totalDentists ?? 0, icon: Users, color: "text-primary" },
        { label: "Abonnés actifs", value: statsData?.activeSubscribers ?? 0, icon: CreditCard, color: "text-primary" },
        { label: "Services en ligne", value: clients.filter(c => c.usesOnline).length, icon: Globe, color: "text-accent" },
    ];

    return (
        <div className="container mx-auto px-4 py-10 space-y-8">
            {/* Title */}
            <motion.div {...anim(0)}>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-7 h-7 text-primary" />
                    Panneau d'Administration
                </h1>
                <p className="text-muted-foreground mt-1">Vue d'ensemble de la plateforme Virela</p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map((s, i) => (
                    <motion.div key={s.label} {...anim(i + 1)}>
                        <Card className="shadow-card hover:shadow-elevated transition-shadow">
                            <CardContent className="flex items-center gap-4 p-5">
                                <div className="p-3 rounded-xl bg-secondary">
                                    <s.icon className={`w-6 h-6 ${s.color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                                    <p className="text-sm text-muted-foreground">{s.label}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Clients Table */}
            <motion.div {...anim(5)}>
                <Card className="shadow-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Users className="w-5 h-5 text-primary" />
                            Liste des Clients ({filteredClients.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                placeholder="Rechercher par nom, email, ville ou clinique…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9"
                            />
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Ville</TableHead>
                                    <TableHead>Licence</TableHead>
                                    <TableHead>En ligne</TableHead>
                                    <TableHead>Inscrit le</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredClients.map((c) => (
                                    <TableRow
                                        key={c.id}
                                        className="cursor-pointer hover:bg-secondary/50"
                                        onClick={() => setSelected(c)}
                                    >
                                        <TableCell className="font-medium text-foreground">
                                            {c.firstName} {c.lastName}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{c.email}</TableCell>
                                        <TableCell className="text-muted-foreground">{c.city}</TableCell>
                                        <TableCell>
                                            <Badge className={licenseColor(c.license.status)}>
                                                {c.license.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${c.usesOnline ? "bg-accent" : "bg-muted-foreground/40"}`} />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(c.createdAt).toLocaleDateString("fr-TN")}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Client Detail Dialog */}
            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                {selected && (
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-foreground text-xl">
                                {selected.firstName} {selected.lastName}
                            </DialogTitle>
                            <DialogDescription>{selected.nameArabic}</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2">
                            <InfoRow icon={Mail} label="Email" value={selected.email} />
                            <InfoRow icon={Phone} label="Téléphone" value={selected.phone ?? "—"} />
                            <InfoRow icon={MapPin} label="Ville" value={selected.city} />
                            <InfoRow icon={Building2} label="Clinique" value={selected.clinicName ?? "—"} />
                            <InfoRow icon={CalendarDays} label="Inscrit le" value={new Date(selected.createdAt).toLocaleDateString("fr-TN")} />

                            <div className="flex items-center justify-between pt-2">
                                <span className="text-sm text-muted-foreground">Licence</span>
                                <Badge className={licenseColor(selected.license.status)}>
                                    {selected.license.status} — {selected.license.type}
                                </Badge>
                            </div>
                        </div>

                        <DialogFooter>
                            {selected.license.status !== "active" || selected.license.type !== "full" ? (
                                <Button
                                    className="bg-hero-gradient text-primary-foreground w-full"
                                    onClick={handleGrantLicense}
                                    disabled={granting}
                                >
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    {granting ? "Attribution en cours…" : "Accorder la Licence"}
                                </Button>
                            ) : (
                                <p className="text-sm text-accent font-medium w-full text-center">✅ Licence complète active</p>
                            )}
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
};

/* Small helper */
const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
    <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm text-muted-foreground w-24">{label}</span>
        <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
);

export default Admin;
