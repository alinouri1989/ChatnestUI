export const groupMessagesByDate = (messages) => {
    if (!messages || messages.length === 0) return [];

    const groupedMessagesByDate = messages.reduce((acc, message) => {
        const sentDate = Object.values(message?.status?.sent)[0];
        const date = sentDate ? sentDate.split("T")[0] : "تاریخ نامعتبر";

        const formattedDate =
            date !== "تاریخ نامعتبر" ? date.split("-").reverse().join(".") : date;

        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

        let groupLabel;
        if (date === today) {
            groupLabel = "امروز";
        } else if (date === yesterday) {
            groupLabel = "دیروز";
        } else {
            groupLabel = formattedDate;
        }

        if (!acc[groupLabel]) acc[groupLabel] = [];
        acc[groupLabel].push({ id: message.id, ...message });

        return acc;
    }, {});

    return Object.entries(groupedMessagesByDate).filter(([_, messages]) => messages.length > 0);
};
