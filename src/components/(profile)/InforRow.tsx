function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between bg-gray-50 rounded-lg px-4 py-3 md:px-5 md:py-4">
      <span className="text-gray-500 text-sm md:text-base">{label}</span>
      <span className="font-medium text-gray-900 text-sm md:text-base">{value}</span>
    </div>
  );
}
export default InfoRow;
