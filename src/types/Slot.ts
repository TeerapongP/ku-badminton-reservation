export type Slot = {
    id: number;
    label: string;
    status: "available" | "reserved" | "pending" | "break";
    bookedBy?: string;
};

