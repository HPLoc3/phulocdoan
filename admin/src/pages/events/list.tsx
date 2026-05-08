import { List, useTable, DateField, EditButton, DeleteButton, FilterDropdown } from "@refinedev/antd";
import { Table, Space, Tag, Input, Select } from "antd";

export const EventList = () => {
    const { tableProps } = useTable({
        syncWithLocation: true,
    });

    return (
        <List>
            <Table {...tableProps} rowKey="id">
                <Table.Column dataIndex="id" title="ID" />
                <Table.Column 
                    dataIndex="title" 
                    title="Tên sự kiện" 
                    filterDropdown={(props) => (
                        <FilterDropdown {...props}>
                            <Input placeholder="Tìm tên sự kiện" />
                        </FilterDropdown>
                    )}
                />
                <Table.Column 
                    dataIndex="event_date" 
                    title="Thời gian" 
                    render={(value: any) => <DateField value={value} format="DD/MM/YYYY HH:mm" />}
                />
                <Table.Column 
                    dataIndex="status" 
                    title="Trạng thái" 
                    filterDropdown={(props) => (
                        <FilterDropdown {...props}>
                            <Select
                                style={{ width: 120 }}
                                options={[
                                    { label: "Draft", value: "draft" },
                                    { label: "Published", value: "published" },
                                    { label: "Cancelled", value: "cancelled" },
                                    { label: "Completed", value: "completed" },
                                ]}
                            />
                        </FilterDropdown>
                    )}
                    render={(value: string) => {
                        let color = "default";
                        if (value === "published") color = "success";
                        if (value === "cancelled") color = "error";
                        return <Tag color={color}>{value}</Tag>;
                    }}
                />
                <Table.Column 
                    dataIndex="ticket_categories" 
                    title="Tình trạng vé" 
                    render={(categories: any[]) => (
                        <Space direction="vertical">
                            {categories?.map((cat) => (
                                <Tag key={cat.id} color={cat.remaining_quantity === 0 ? "red" : "blue"}>
                                    {cat.name}: {cat.remaining_quantity} / {cat.total_quantity}
                                </Tag>
                            ))}
                        </Space>
                    )}
                />
                <Table.Column
                    title="Actions"
                    dataIndex="actions"
                    render={(_, record: any) => (
                        <Space>
                            <EditButton hideText size="small" recordItemId={record.id} />
                            <DeleteButton hideText size="small" recordItemId={record.id} />
                        </Space>
                    )}
                />
            </Table>
        </List>
    );
};
