import { List, useTable, DateField, FilterDropdown } from "@refinedev/antd";
import { Table, Tag, Select } from "antd";

export const BookingList = () => {
    const { tableProps } = useTable({
        syncWithLocation: true,
    });

    return (
        <List>
            <Table {...tableProps} rowKey="id">
                <Table.Column dataIndex="id" title="ID" />
                <Table.Column 
                    dataIndex="event_title" 
                    title="Tên sự kiện" 
                    filterDropdown={(props) => (
                        <FilterDropdown {...props}>
                            <Input placeholder="Tìm tên sự kiện" />
                        </FilterDropdown>
                    )}
                />
                <Table.Column 
                    dataIndex="status" 
                    title="Trạng thái" 
                    filterDropdown={(props) => (
                        <FilterDropdown {...props}>
                            <Select
                                style={{ width: 150 }}
                                options={[
                                    { label: "Pending", value: "pending" },
                                    { label: "Confirmed", value: "confirmed" },
                                    { label: "Paid", value: "paid" },
                                    { label: "Cancelled", value: "cancelled" },
                                ]}
                            />
                        </FilterDropdown>
                    )}
                    render={(value: string) => {
                        const colors: Record<string, string> = {
                            pending: "orange",
                            confirmed: "blue",
                            payment_pending: "gold",
                            paid: "green",
                            cancelled: "red",
                            failed: "volcano",
                        };
                        return <Tag color={colors[value] || "default"}>{value?.toUpperCase()}</Tag>;
                    }}
                />
                <Table.Column 
                    dataIndex="total_amount" 
                    title="Tổng tiền" 
                    render={(value: number) => (
                        <b>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                        </b>
                    )}
                />
                <Table.Column 
                    dataIndex="created_at" 
                    title="Ngày đặt" 
                    render={(value: any) => <DateField value={value} format="DD/MM/YYYY HH:mm:ss" />}
                />
            </Table>
        </List>
    );
};
