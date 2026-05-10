import { Edit, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select, DatePicker, Switch } from "antd";
import dayjs from "dayjs";
import { TicketCategoriesSection } from "../../components/TicketCategoriesSection";

export const EventEdit = () => {
    const { formProps, saveButtonProps, queryResult } = useForm({});

    const { selectProps: venueSelectProps } = useSelect({
        resource: "venues",
        optionLabel: "name",
        optionValue: "id",
        defaultValue: queryResult?.data?.data?.venue_id,
    });

    const eventData = queryResult?.data?.data;

    return (
        <Edit saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item
                    label="Tên sự kiện"
                    name={["title"]}
                    rules={[{ required: true }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label="Địa điểm (Venue)"
                    name={["venue_id"]}
                    rules={[{ required: true }]}
                >
                    <Select {...venueSelectProps} placeholder="Chọn địa điểm tổ chức" />
                </Form.Item>
                <Form.Item
                    label="Mô tả"
                    name={["description"]}
                >
                    <Input.TextArea rows={4} />
                </Form.Item>
                <Form.Item
                    label="Ngày diễn ra"
                    name={["event_date"]}
                    rules={[{ required: true }]}
                    getValueProps={(value) => ({
                        value: value ? dayjs(value) : undefined,
                    })}
                >
                    <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" />
                </Form.Item>
                <Form.Item
                    label="Trạng thái"
                    name={["status"]}
                >
                    <Select
                        options={[
                            { label: "Bản nháp", value: "draft" },
                            { label: "Đã xuất bản", value: "published" },
                            { label: "Đã huỷ", value: "cancelled" },
                            { label: "Đã hoàn thành", value: "completed" },
                        ]}
                    />
                </Form.Item>
                <Form.Item
                    label="Flash Sale"
                    name={["is_flash_sale"]}
                    valuePropName="checked"
                >
                    <Switch />
                </Form.Item>
            </Form>

            {eventData?.id ? (
                <TicketCategoriesSection eventId={Number(eventData.id)} />
            ) : null}
        </Edit>
    );
};
